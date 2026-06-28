import { ChannelManager } from "@/lib/services/ChannelManager";
import { MIDI_CC_CHANNEL, MIDI_CC_EVENT, midiCcSendSchema } from "@/lib/models/Midi";

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

const mockBroadcast = jest.fn();
const mockGetChannelSubscribers = jest.fn();

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

describe("ChannelManager.publishMidiCc", () => {
  beforeAll(() => {
    (ChannelManager as unknown as { instance: ChannelManager | undefined }).instance = undefined;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("broadcasts a 'cc' event on the midi channel, no ack", () => {
    const cm = ChannelManager.getInstance();
    const payload = midiCcSendSchema.parse({ bus: "qlc-in", note: 81, value: 127, duration: 2 });
    cm.publishMidiCc(payload);

    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    expect(mockBroadcast).toHaveBeenCalledWith(
      MIDI_CC_CHANNEL,
      expect.objectContaining({
        channel: MIDI_CC_CHANNEL,
        type: MIDI_CC_EVENT,
        payload,
      })
    );
    // Passive subscriber: no ack timeout is set (no second broadcast / no system event).
    expect(MIDI_CC_CHANNEL).toBe("midi");
  });
});
