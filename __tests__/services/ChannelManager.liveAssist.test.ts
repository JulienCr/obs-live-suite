import { ChannelManager } from "@/lib/services/ChannelManager";
import { LIVE_ASSIST } from "@/lib/config/Constants";

// Mock Logger to avoid side effects
jest.mock("@/lib/utils/Logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock crypto.randomUUID for predictable IDs
const mockUUID = "mock-uuid-1234-5678-90ab-cdef12345678";
jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => mockUUID),
}));

// Create mock functions for WebSocketHub
const mockBroadcast = jest.fn();
const mockGetChannelSubscribers = jest.fn();

// Mock WebSocketHub
jest.mock("@/lib/services/WebSocketHub", () => ({
  WebSocketHub: {
    getInstance: jest.fn(() => ({
      broadcast: mockBroadcast,
      getChannelSubscribers: mockGetChannelSubscribers,
      setOnAckCallback: jest.fn(),
      setOnClientDisconnectCallback: jest.fn(),
      setOnSubscribeCallback: jest.fn(),
      sendToClient: jest.fn(),
    })),
  },
}));

describe("ChannelManager.publishLiveAssist", () => {
  beforeAll(() => {
    // Reset singleton instance
    (ChannelManager as unknown as { instance: ChannelManager | undefined }).instance = undefined;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("broadcasts the event on the live-assist channel without ack", () => {
    const cm = ChannelManager.getInstance();
    cm.publishLiveAssist({ type: "stt:status", payload: { connected: true, device: "mic" } });
    expect(mockBroadcast).toHaveBeenCalledWith(
      LIVE_ASSIST.CHANNEL,
      expect.objectContaining({ type: "stt:status" })
    );
  });
});
