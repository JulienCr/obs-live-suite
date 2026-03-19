import { randomUUID } from "crypto";
import { Logger } from "../utils/Logger";
import { ChannelManager } from "./ChannelManager";
import { StreamerbotGateway } from "../adapters/streamerbot/StreamerbotGateway";
import { OverlayChannel } from "../models/OverlayEvents";
import { WORD_HARVEST } from "../config/Constants";
import type { ChatMessage } from "../models/StreamerbotChat";
import {
  WordHarvestEventType,
  type WordHarvestPhase,
  type HarvestWord,
  type WordHarvestState,
} from "../models/WordHarvest";

/**
 * WordHarvestManager manages the "10 words" improv game.
 *
 * State machine: idle → collecting → complete → performing → done
 *
 * During "collecting", chat messages matching #word or !mot word are queued
 * for moderation. The regie approves/rejects words. When the target count
 * is reached, the game transitions to "complete" (celebration). The regie
 * then manually triggers "performing" where they strike through used words.
 */
export class WordHarvestManager {
  private static instance: WordHarvestManager;

  private logger = new Logger("WordHarvestManager");
  private channelManager: ChannelManager;
  private streamerbotGateway: StreamerbotGateway;

  private phase: WordHarvestPhase = "idle";
  private targetCount: number = WORD_HARVEST.DEFAULT_TARGET_COUNT;
  private pendingWords: HarvestWord[] = [];
  private approvedWords: HarvestWord[] = [];
  private visible = false;

  /** Normalized words already seen (for dedup across pending + approved + rejected) */
  private seenWords = new Set<string>();

  /** Bound listener reference for cleanup */
  private boundChatListener = this.onChatMessage.bind(this);
  private listening = false;

  private constructor() {
    this.channelManager = ChannelManager.getInstance();
    this.streamerbotGateway = StreamerbotGateway.getInstance();
  }

  static getInstance(): WordHarvestManager {
    if (!WordHarvestManager.instance) {
      WordHarvestManager.instance = new WordHarvestManager();
    }
    return WordHarvestManager.instance;
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  getState(): WordHarvestState {
    return {
      phase: this.phase,
      targetCount: this.targetCount,
      pendingWords: [...this.pendingWords],
      approvedWords: [...this.approvedWords],
      visible: this.visible,
    };
  }

  startGame(targetCount?: number): void {
    if (this.phase !== "idle") {
      throw new Error(`Cannot start game in phase "${this.phase}"`);
    }

    this.targetCount = targetCount ?? WORD_HARVEST.DEFAULT_TARGET_COUNT;
    this.phase = "collecting";
    this.visible = true;
    this.registerChatListener();

    this.logger.info(`Word harvest started, target: ${this.targetCount}`);
    this.publishStateUpdate();
  }

  stopGame(): void {
    if (this.phase === "idle") {
      throw new Error("No game in progress");
    }

    this.unregisterChatListener();
    this.phase = "idle";
    this.visible = false;
    this.pendingWords = [];
    this.approvedWords = [];
    this.seenWords.clear();

    this.logger.info("Word harvest stopped");
    this.publishEvent(WordHarvestEventType.HIDE);
    this.publishStateUpdate();
  }

  resetGame(): void {
    this.unregisterChatListener();
    this.phase = "idle";
    this.targetCount = WORD_HARVEST.DEFAULT_TARGET_COUNT;
    this.pendingWords = [];
    this.approvedWords = [];
    this.seenWords.clear();
    this.visible = false;

    this.logger.info("Word harvest reset");
    this.publishEvent(WordHarvestEventType.RESET);
    this.publishStateUpdate();
  }

  approveWord(wordId: string): void {
    if (this.phase !== "collecting") {
      throw new Error(`Cannot approve words in phase "${this.phase}"`);
    }

    const idx = this.pendingWords.findIndex((w) => w.id === wordId);
    if (idx === -1) {
      throw new Error(`Word "${wordId}" not found in pending queue`);
    }

    const word = this.pendingWords.splice(idx, 1)[0];
    word.status = "approved";
    this.approvedWords.push(word);

    this.logger.info(`Word approved: "${word.word}" (${this.approvedWords.length}/${this.targetCount})`);

    this.publishEvent(WordHarvestEventType.WORD_APPROVED, {
      word,
      approvedWords: [...this.approvedWords],
      targetCount: this.targetCount,
    });

    // Check completion
    if (this.approvedWords.length >= this.targetCount) {
      this.onTargetReached();
    }
  }

  rejectWord(wordId: string): void {
    if (this.phase !== "collecting") {
      throw new Error(`Cannot reject words in phase "${this.phase}"`);
    }

    const idx = this.pendingWords.findIndex((w) => w.id === wordId);
    if (idx === -1) {
      throw new Error(`Word "${wordId}" not found in pending queue`);
    }

    const word = this.pendingWords.splice(idx, 1)[0];
    word.status = "rejected";
    // Keep normalizedWord in seenWords to prevent re-submission
    this.logger.info(`Word rejected: "${word.word}"`);

    this.publishEvent(WordHarvestEventType.WORD_REJECTED, { wordId });
    this.publishStateUpdate();
  }

  markWordUsed(wordId: string): void {
    if (this.phase !== "performing") {
      throw new Error(`Cannot mark words in phase "${this.phase}"`);
    }

    const word = this.approvedWords.find((w) => w.id === wordId);
    if (!word) {
      throw new Error(`Word "${wordId}" not found in approved list`);
    }
    if (word.used) return; // Already used, no-op

    word.used = true;
    word.usedAt = Date.now();

    this.logger.info(`Word used: "${word.word}"`);
    this.publishEvent(WordHarvestEventType.WORD_USED, { wordId, used: true });

    // Check if all words are used — transition to "done" but wait for regie to trigger finale
    if (this.approvedWords.every((w) => w.used)) {
      this.phase = "done";
      this.logger.info("All words used! Waiting for regie to trigger finale.");
      this.publishStateUpdate();
    }
  }

  unmarkWordUsed(wordId: string): void {
    if (this.phase !== "performing" && this.phase !== "done") {
      throw new Error(`Cannot unmark words in phase "${this.phase}"`);
    }

    const word = this.approvedWords.find((w) => w.id === wordId);
    if (!word) {
      throw new Error(`Word "${wordId}" not found in approved list`);
    }
    if (!word.used) return; // Already unused, no-op

    word.used = false;
    word.usedAt = undefined;

    // If we were "done", revert to "performing"
    if (this.phase === "done") {
      this.phase = "performing";
    }

    this.logger.info(`Word unmarked: "${word.word}"`);
    this.publishEvent(WordHarvestEventType.WORD_UNUSED, { wordId, used: false });
    this.publishStateUpdate();
  }

  startPerforming(): void {
    if (this.phase !== "complete") {
      throw new Error(`Cannot start performing in phase "${this.phase}"`);
    }
    this.phase = "performing";
    this.logger.info("Improv started by regie");
    this.publishEvent(WordHarvestEventType.START_PERFORMING, {
      targetCount: this.targetCount,
    });
    this.publishStateUpdate();
  }

  triggerFinale(): void {
    if (this.phase !== "done") {
      throw new Error(`Cannot trigger finale in phase "${this.phase}"`);
    }
    this.logger.info("Finale triggered by regie — ending game");
    this.publishEvent(WordHarvestEventType.ALL_USED, {
      targetCount: this.targetCount,
    });

    // End the game after finale
    this.phase = "idle";
    this.visible = false;
    this.pendingWords = [];
    this.approvedWords = [];
    this.seenWords.clear();
    this.publishStateUpdate();
  }

  showOverlay(): void {
    this.visible = true;
    this.publishStateUpdate();
  }

  hideOverlay(): void {
    this.visible = false;
    this.publishEvent(WordHarvestEventType.HIDE);
  }

  // ===========================================================================
  // Chat Listener
  // ===========================================================================

  private registerChatListener(): void {
    if (this.listening) return;
    this.streamerbotGateway.addChatListener(this.boundChatListener);
    this.listening = true;
    this.logger.debug("Chat listener registered");
  }

  private unregisterChatListener(): void {
    if (!this.listening) return;
    this.streamerbotGateway.removeChatListener(this.boundChatListener);
    this.listening = false;
    this.logger.debug("Chat listener unregistered");
  }

  private onChatMessage(message: ChatMessage): void {
    if (this.phase !== "collecting") return;
    if (message.eventType !== "message") return;

    const extracted = this.extractWord(message.message);
    if (!extracted) return;

    const normalized = extracted.toLowerCase().trim();

    // Validate length
    if (normalized.length < WORD_HARVEST.MIN_WORD_LENGTH || normalized.length > WORD_HARVEST.MAX_WORD_LENGTH) {
      return;
    }

    // Dedup
    if (this.seenWords.has(normalized)) return;
    this.seenWords.add(normalized);

    const word: HarvestWord = {
      id: randomUUID(),
      word: extracted,
      normalizedWord: normalized,
      submittedBy: message.username,
      displayName: message.displayName,
      submittedAt: Date.now(),
      status: "pending",
      used: false,
    };

    this.pendingWords.push(word);
    this.logger.debug(`Word queued: "${extracted}" from ${message.displayName}`);

    this.publishEvent(WordHarvestEventType.WORD_PENDING, {
      word,
      pendingCount: this.pendingWords.length,
    });
  }

  /** Extract a word from a chat message, or null if not a word command */
  extractWord(text: string): string | null {
    const match = text.trim().match(WORD_HARVEST.WORD_COMMAND_REGEX);
    if (!match) return null;
    return match[1] ?? match[2] ?? null;
  }

  // ===========================================================================
  // State Transitions
  // ===========================================================================

  private onTargetReached(): void {
    this.unregisterChatListener();
    this.phase = "complete";

    this.logger.info(`Target reached! ${this.targetCount} words collected.`);
    this.publishEvent(WordHarvestEventType.CELEBRATION, {
      targetCount: this.targetCount,
    });
  }

  // ===========================================================================
  // Publishing
  // ===========================================================================

  private publishStateUpdate(): void {
    this.publishEvent(WordHarvestEventType.STATE_UPDATE, this.getState());
  }

  private publishEvent(type: WordHarvestEventType, payload?: unknown): void {
    this.channelManager.publish(OverlayChannel.WORD_HARVEST, type, payload);
  }
}
