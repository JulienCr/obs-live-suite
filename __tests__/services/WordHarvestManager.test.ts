import { WordHarvestManager } from "../../lib/services/WordHarvestManager";
import { ChannelManager } from "../../lib/services/ChannelManager";
import { StreamerbotGateway } from "../../lib/adapters/streamerbot/StreamerbotGateway";
import { OverlayChannel } from "../../lib/models/OverlayEvents";
import { WordHarvestEventType } from "../../lib/models/WordHarvest";
import type { ChatMessage } from "../../lib/models/StreamerbotChat";

// Mock dependencies
jest.mock("../../lib/services/ChannelManager");
jest.mock("../../lib/adapters/streamerbot/StreamerbotGateway");
jest.mock("../../lib/utils/Logger");

function createMockChatMessage(message: string, username = "testuser"): ChatMessage {
  return {
    id: `msg-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "message",
    username,
    displayName: username,
    message,
  };
}

describe("WordHarvestManager", () => {
  let manager: WordHarvestManager;
  let mockPublish: jest.Mock;
  let mockAddChatListener: jest.Mock;
  let mockRemoveChatListener: jest.Mock;
  let capturedChatListener: ((msg: ChatMessage) => void) | null;

  beforeEach(() => {
    // Reset singleton
    (WordHarvestManager as any).instance = undefined;

    mockPublish = jest.fn();
    mockAddChatListener = jest.fn((cb: (msg: ChatMessage) => void) => {
      capturedChatListener = cb;
    });
    mockRemoveChatListener = jest.fn();

    (ChannelManager.getInstance as jest.Mock).mockReturnValue({
      publish: mockPublish,
    });

    (StreamerbotGateway.getInstance as jest.Mock).mockReturnValue({
      addChatListener: mockAddChatListener,
      removeChatListener: mockRemoveChatListener,
    });

    capturedChatListener = null;
    manager = WordHarvestManager.getInstance();
  });

  describe("singleton", () => {
    it("returns the same instance", () => {
      expect(WordHarvestManager.getInstance()).toBe(manager);
    });
  });

  describe("initial state", () => {
    it("starts in idle phase", () => {
      const state = manager.getState();
      expect(state.phase).toBe("idle");
      expect(state.targetCount).toBe(10);
      expect(state.pendingWords).toHaveLength(0);
      expect(state.approvedWords).toHaveLength(0);
      expect(state.visible).toBe(false);
    });
  });

  describe("startGame", () => {
    it("transitions to collecting with default target", () => {
      manager.startGame();
      const state = manager.getState();
      expect(state.phase).toBe("collecting");
      expect(state.targetCount).toBe(10);
      expect(state.visible).toBe(true);
    });

    it("transitions to collecting with custom target", () => {
      manager.startGame(5);
      expect(manager.getState().targetCount).toBe(5);
    });

    it("registers chat listener", () => {
      manager.startGame();
      expect(mockAddChatListener).toHaveBeenCalledTimes(1);
    });

    it("publishes state update", () => {
      manager.startGame();
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.WORD_HARVEST,
        WordHarvestEventType.STATE_UPDATE,
        expect.objectContaining({ phase: "collecting" })
      );
    });

    it("throws if not idle", () => {
      manager.startGame();
      expect(() => manager.startGame()).toThrow('Cannot start game in phase "collecting"');
    });
  });

  describe("stopGame", () => {
    it("transitions back to idle", () => {
      manager.startGame();
      manager.stopGame();
      expect(manager.getState().phase).toBe("idle");
      expect(manager.getState().visible).toBe(false);
    });

    it("unregisters chat listener", () => {
      manager.startGame();
      manager.stopGame();
      expect(mockRemoveChatListener).toHaveBeenCalledTimes(1);
    });

    it("throws if idle", () => {
      expect(() => manager.stopGame()).toThrow("No game in progress");
    });
  });

  describe("resetGame", () => {
    it("clears all state", () => {
      manager.startGame(5);
      manager.resetGame();
      const state = manager.getState();
      expect(state.phase).toBe("idle");
      expect(state.targetCount).toBe(10); // Reset to default
      expect(state.pendingWords).toHaveLength(0);
      expect(state.approvedWords).toHaveLength(0);
      expect(state.visible).toBe(false);
    });

    it("publishes reset event", () => {
      manager.startGame();
      mockPublish.mockClear();
      manager.resetGame();
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.WORD_HARVEST,
        WordHarvestEventType.RESET,
        undefined
      );
    });
  });

  describe("extractWord", () => {
    it("extracts #word format", () => {
      expect(manager.extractWord("#bateau")).toBe("bateau");
    });

    it("extracts !mot word format", () => {
      expect(manager.extractWord("!mot soleil")).toBe("soleil");
    });

    it("extracts #Word (case-insensitive prefix)", () => {
      expect(manager.extractWord("#Bateau")).toBe("Bateau");
    });

    it("returns null for non-command messages", () => {
      expect(manager.extractWord("hello world")).toBeNull();
    });

    it("returns null for empty hash", () => {
      expect(manager.extractWord("#")).toBeNull();
    });

    it("handles !MOT (case-insensitive)", () => {
      expect(manager.extractWord("!MOT test")).toBe("test");
    });
  });

  describe("chat message processing", () => {
    beforeEach(() => {
      manager.startGame(3);
    });

    it("queues word from #word format", () => {
      capturedChatListener!(createMockChatMessage("#bateau"));
      expect(manager.getState().pendingWords).toHaveLength(1);
      expect(manager.getState().pendingWords[0].word).toBe("bateau");
    });

    it("queues word from !mot format", () => {
      capturedChatListener!(createMockChatMessage("!mot soleil"));
      expect(manager.getState().pendingWords).toHaveLength(1);
      expect(manager.getState().pendingWords[0].word).toBe("soleil");
    });

    it("deduplicates case-insensitive", () => {
      capturedChatListener!(createMockChatMessage("#bateau"));
      capturedChatListener!(createMockChatMessage("#BATEAU"));
      capturedChatListener!(createMockChatMessage("!mot Bateau"));
      expect(manager.getState().pendingWords).toHaveLength(1);
    });

    it("ignores non-command messages", () => {
      capturedChatListener!(createMockChatMessage("hello world"));
      expect(manager.getState().pendingWords).toHaveLength(0);
    });

    it("ignores too short words", () => {
      capturedChatListener!(createMockChatMessage("#a"));
      expect(manager.getState().pendingWords).toHaveLength(0);
    });

    it("ignores non-message events", () => {
      const msg = createMockChatMessage("#bateau");
      msg.eventType = "follow";
      capturedChatListener!(msg);
      expect(manager.getState().pendingWords).toHaveLength(0);
    });

    it("publishes WORD_PENDING event", () => {
      mockPublish.mockClear();
      capturedChatListener!(createMockChatMessage("#bateau"));
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.WORD_HARVEST,
        WordHarvestEventType.WORD_PENDING,
        expect.objectContaining({
          word: expect.objectContaining({ word: "bateau" }),
          pendingCount: 1,
        })
      );
    });
  });

  describe("approve / reject", () => {
    beforeEach(() => {
      manager.startGame(3);
      capturedChatListener!(createMockChatMessage("#bateau"));
      capturedChatListener!(createMockChatMessage("#soleil"));
    });

    it("approves a pending word", () => {
      const wordId = manager.getState().pendingWords[0].id;
      manager.approveWord(wordId);
      expect(manager.getState().pendingWords).toHaveLength(1);
      expect(manager.getState().approvedWords).toHaveLength(1);
      expect(manager.getState().approvedWords[0].word).toBe("bateau");
    });

    it("publishes WORD_APPROVED event", () => {
      const wordId = manager.getState().pendingWords[0].id;
      mockPublish.mockClear();
      manager.approveWord(wordId);
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.WORD_HARVEST,
        WordHarvestEventType.WORD_APPROVED,
        expect.objectContaining({
          word: expect.objectContaining({ word: "bateau" }),
        })
      );
    });

    it("rejects a pending word", () => {
      const wordId = manager.getState().pendingWords[0].id;
      manager.rejectWord(wordId);
      expect(manager.getState().pendingWords).toHaveLength(1);
      expect(manager.getState().approvedWords).toHaveLength(0);
    });

    it("rejected word stays deduped", () => {
      const wordId = manager.getState().pendingWords[0].id;
      manager.rejectWord(wordId);
      capturedChatListener!(createMockChatMessage("#bateau"));
      expect(manager.getState().pendingWords).toHaveLength(1); // Only soleil
    });

    it("throws for unknown word id", () => {
      expect(() => manager.approveWord("unknown")).toThrow('Word "unknown" not found in pending queue');
    });

    it("throws when not collecting", () => {
      manager.stopGame();
      expect(() => manager.approveWord("any")).toThrow('Cannot approve words in phase "idle"');
    });
  });

  describe("completion", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      manager.startGame(2);
      capturedChatListener!(createMockChatMessage("#bateau"));
      capturedChatListener!(createMockChatMessage("#soleil"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("transitions to complete when target reached", () => {
      manager.approveWord(manager.getState().pendingWords[0].id);
      manager.approveWord(manager.getState().pendingWords[0].id);
      expect(manager.getState().phase).toBe("complete");
    });

    it("publishes celebration event", () => {
      manager.approveWord(manager.getState().pendingWords[0].id);
      mockPublish.mockClear();
      manager.approveWord(manager.getState().pendingWords[0].id);
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.WORD_HARVEST,
        WordHarvestEventType.CELEBRATION,
        { targetCount: 2 }
      );
    });

    it("unregisters chat listener on completion", () => {
      manager.approveWord(manager.getState().pendingWords[0].id);
      manager.approveWord(manager.getState().pendingWords[0].id);
      expect(mockRemoveChatListener).toHaveBeenCalled();
    });
  });

  describe("markWordUsed / unmarkWordUsed", () => {
    beforeEach(() => {
      manager.startGame(2);
      capturedChatListener!(createMockChatMessage("#bateau"));
      capturedChatListener!(createMockChatMessage("#soleil"));
      manager.approveWord(manager.getState().pendingWords[0].id);
      manager.approveWord(manager.getState().pendingWords[0].id);
      manager.startPerforming(); // Manual transition to "performing"
    });

    it("marks word as used", () => {
      const wordId = manager.getState().approvedWords[0].id;
      manager.markWordUsed(wordId);
      expect(manager.getState().approvedWords[0].used).toBe(true);
    });

    it("publishes WORD_USED event", () => {
      const wordId = manager.getState().approvedWords[0].id;
      mockPublish.mockClear();
      manager.markWordUsed(wordId);
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.WORD_HARVEST,
        WordHarvestEventType.WORD_USED,
        { wordId, used: true }
      );
    });

    it("transitions to done when all words used", () => {
      manager.markWordUsed(manager.getState().approvedWords[0].id);
      manager.markWordUsed(manager.getState().approvedWords[1].id);
      expect(manager.getState().phase).toBe("done");
    });

    it("unmarks word and reverts to performing", () => {
      manager.markWordUsed(manager.getState().approvedWords[0].id);
      manager.markWordUsed(manager.getState().approvedWords[1].id);
      expect(manager.getState().phase).toBe("done");

      manager.unmarkWordUsed(manager.getState().approvedWords[0].id);
      expect(manager.getState().phase).toBe("performing");
      expect(manager.getState().approvedWords[0].used).toBe(false);
    });

    it("no-op if already used", () => {
      const wordId = manager.getState().approvedWords[0].id;
      manager.markWordUsed(wordId);
      mockPublish.mockClear();
      manager.markWordUsed(wordId); // Should be no-op
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it("throws for unknown word id", () => {
      expect(() => manager.markWordUsed("unknown")).toThrow('Word "unknown" not found in approved list');
    });
  });

  describe("showOverlay / hideOverlay", () => {
    it("toggles visibility", () => {
      manager.showOverlay();
      expect(manager.getState().visible).toBe(true);

      manager.hideOverlay();
      // hideOverlay publishes HIDE event but doesn't trigger getState update via setState
      // The event tells the overlay to hide
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.WORD_HARVEST,
        WordHarvestEventType.HIDE,
        undefined
      );
    });
  });
});
