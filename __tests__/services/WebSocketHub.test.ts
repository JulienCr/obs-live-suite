import { WebSocket } from "ws";
import { RoomRole } from "@/lib/models/Room";
import { WEBSOCKET } from "@/lib/config/Constants";

// Mock Logger
jest.mock("@/lib/utils/Logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock AppConfig
jest.mock("@/lib/config/AppConfig", () => ({
  AppConfig: {
    getInstance: jest.fn(() => ({
      websocketPort: 3003,
    })),
  },
}));

// Mock CertificateManager
jest.mock("@/lib/utils/CertificateManager", () => ({
  createHttpServerWithFallback: jest.fn(() => ({
    server: {
      on: jest.fn(),
      listen: jest.fn((port: number, callback: () => void) => {
        callback();
      }),
      close: jest.fn(),
    },
    isHttps: false,
  })),
}));

// Mock WebSocketServer
const mockWssOn = jest.fn();
const mockWssClose = jest.fn();

jest.mock("ws", () => {
  const actual = jest.requireActual("ws");
  return {
    ...actual,
    WebSocketServer: jest.fn().mockImplementation(() => ({
      on: mockWssOn,
      close: mockWssClose,
    })),
  };
});

// Import after mocking
import { WebSocketHub } from "@/lib/services/WebSocketHub";

describe("WebSocketHub", () => {
  let hub: WebSocketHub;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton instance for isolation
    // @ts-expect-error - accessing private static property for testing
    WebSocketHub.instance = undefined;

    hub = WebSocketHub.getInstance();
  });

  afterEach(() => {
    // Stop the hub if started
    hub.stop();
    jest.useRealTimers();
  });

  describe("getInstance", () => {
    it("should return the same instance (singleton pattern)", () => {
      const instance1 = WebSocketHub.getInstance();
      const instance2 = WebSocketHub.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create instance on first call", () => {
      // @ts-expect-error - accessing private static property for testing
      WebSocketHub.instance = undefined;

      const instance = WebSocketHub.getInstance();

      expect(instance).toBeInstanceOf(WebSocketHub);
    });
  });

  describe("start", () => {
    it("should only start once (idempotent)", () => {
      hub.start();
      hub.start(); // Second call should be skipped

      expect(hub.wasAttempted()).toBe(true);
    });

    it("should register connection handler on WebSocketServer", () => {
      hub.start();

      expect(mockWssOn).toHaveBeenCalledWith("connection", expect.any(Function));
    });

    it("should start heartbeat interval", () => {
      hub.start();

      // Heartbeat starts on server listen callback
      expect(hub.isRunning()).toBe(true);
    });
  });

  describe("stop", () => {
    it("should clear heartbeat interval", () => {
      hub.start();
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      hub.stop();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("should close WebSocketServer", () => {
      hub.start();

      hub.stop();

      expect(mockWssClose).toHaveBeenCalled();
    });

    it("should reset startAttempted flag", () => {
      hub.start();
      expect(hub.wasAttempted()).toBe(true);

      hub.stop();

      expect(hub.wasAttempted()).toBe(false);
    });

    it("should clear clients map", () => {
      hub.start();

      hub.stop();

      expect(hub.getClientCount()).toBe(0);
    });
  });

  describe("isRunning", () => {
    it("should return false before start", () => {
      expect(hub.isRunning()).toBe(false);
    });

    it("should return true after start", () => {
      hub.start();

      expect(hub.isRunning()).toBe(true);
    });

    it("should return false after stop", () => {
      hub.start();
      hub.stop();

      expect(hub.isRunning()).toBe(false);
    });
  });

  describe("wasAttempted", () => {
    it("should return false before start", () => {
      expect(hub.wasAttempted()).toBe(false);
    });

    it("should return true after start", () => {
      hub.start();

      expect(hub.wasAttempted()).toBe(true);
    });
  });

  describe("getClientCount", () => {
    it("should return 0 when no clients connected", () => {
      hub.start();

      expect(hub.getClientCount()).toBe(0);
    });
  });

  describe("getChannelSubscribers", () => {
    it("should return 0 when no subscribers for channel", () => {
      hub.start();

      expect(hub.getChannelSubscribers("test-channel")).toBe(0);
    });
  });
});

describe("WebSocketHub - Client Connection Handling", () => {
  let hub: WebSocketHub;
  let connectionHandler: (ws: WebSocket) => void;
  let mockWs: jest.Mocked<Partial<WebSocket>>;
  let messageHandler: (data: Buffer) => void;
  let closeHandler: () => void;
  let errorHandler: (error: Error) => void;
  let pongHandler: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // @ts-expect-error - accessing private static property for testing
    WebSocketHub.instance = undefined;

    // Create mock WebSocket
    mockWs = {
      on: jest.fn((event: string, handler: unknown) => {
        if (event === "message") messageHandler = handler as (data: Buffer) => void;
        if (event === "close") closeHandler = handler as () => void;
        if (event === "error") errorHandler = handler as (error: Error) => void;
        if (event === "pong") pongHandler = handler as () => void;
        return mockWs as WebSocket;
      }),
      send: jest.fn(),
      ping: jest.fn(),
      terminate: jest.fn(),
      readyState: WebSocket.OPEN,
    };

    // Capture connection handler
    mockWssOn.mockImplementation((event: string, handler: unknown) => {
      if (event === "connection") {
        connectionHandler = handler as (ws: WebSocket) => void;
      }
    });

    hub = WebSocketHub.getInstance();
    hub.start();

    // Simulate client connection
    connectionHandler(mockWs as unknown as WebSocket);
  });

  afterEach(() => {
    hub.stop();
    jest.useRealTimers();
  });

  describe("connection lifecycle", () => {
    it("should add client on connection", () => {
      expect(hub.getClientCount()).toBe(1);
    });

    it("should register message handler", () => {
      expect(mockWs.on).toHaveBeenCalledWith("message", expect.any(Function));
    });

    it("should register close handler", () => {
      expect(mockWs.on).toHaveBeenCalledWith("close", expect.any(Function));
    });

    it("should register error handler", () => {
      expect(mockWs.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("should register pong handler", () => {
      expect(mockWs.on).toHaveBeenCalledWith("pong", expect.any(Function));
    });

    it("should remove client on disconnect", () => {
      closeHandler();

      expect(hub.getClientCount()).toBe(0);
    });
  });

  describe("message handling - subscribe", () => {
    it("should subscribe client to channel", () => {
      const message = JSON.stringify({ type: "subscribe", channel: "lower-third" });
      messageHandler(Buffer.from(message));

      expect(hub.getChannelSubscribers("lower-third")).toBe(1);
    });

    it("should allow subscribing to multiple channels", () => {
      messageHandler(Buffer.from(JSON.stringify({ type: "subscribe", channel: "lower-third" })));
      messageHandler(Buffer.from(JSON.stringify({ type: "subscribe", channel: "countdown" })));

      expect(hub.getChannelSubscribers("lower-third")).toBe(1);
      expect(hub.getChannelSubscribers("countdown")).toBe(1);
    });

    it("should ignore subscribe without channel", () => {
      messageHandler(Buffer.from(JSON.stringify({ type: "subscribe" })));

      expect(hub.getChannelSubscribers("undefined")).toBe(0);
    });
  });

  describe("message handling - unsubscribe", () => {
    it("should unsubscribe client from channel", () => {
      messageHandler(Buffer.from(JSON.stringify({ type: "subscribe", channel: "test" })));
      expect(hub.getChannelSubscribers("test")).toBe(1);

      messageHandler(Buffer.from(JSON.stringify({ type: "unsubscribe", channel: "test" })));

      expect(hub.getChannelSubscribers("test")).toBe(0);
    });

    it("should ignore unsubscribe without channel", () => {
      messageHandler(Buffer.from(JSON.stringify({ type: "subscribe", channel: "test" })));
      messageHandler(Buffer.from(JSON.stringify({ type: "unsubscribe" })));

      expect(hub.getChannelSubscribers("test")).toBe(1);
    });
  });

  describe("message handling - ack", () => {
    it("should handle ack message without error", () => {
      expect(() => {
        messageHandler(Buffer.from(JSON.stringify({ type: "ack" })));
      }).not.toThrow();
    });
  });

  describe("message handling - state", () => {
    it("should broadcast state updates to subscribed clients", () => {
      messageHandler(Buffer.from(JSON.stringify({ type: "subscribe", channel: "test-channel" })));

      const stateMessage = {
        type: "state",
        channel: "test-channel",
        data: { visible: true },
      };
      messageHandler(Buffer.from(JSON.stringify(stateMessage)));

      expect(mockWs.send).toHaveBeenCalled();
    });

    it("should ignore state without channel", () => {
      messageHandler(Buffer.from(JSON.stringify({ type: "state", data: { test: true } })));

      // Should not throw or cause issues
      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe("message handling - invalid messages", () => {
    it("should handle invalid JSON gracefully", () => {
      expect(() => {
        messageHandler(Buffer.from("not valid json"));
      }).not.toThrow();
    });

    it("should handle unknown message type", () => {
      expect(() => {
        messageHandler(Buffer.from(JSON.stringify({ type: "unknown-type" })));
      }).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle WebSocket errors gracefully", () => {
      expect(() => {
        errorHandler(new Error("Test WebSocket error"));
      }).not.toThrow();
    });
  });

  describe("pong handler", () => {
    it("should mark client as alive on pong", () => {
      // Pong handler updates client.isAlive
      pongHandler();
      // No direct way to verify, but should not throw
      expect(hub.getClientCount()).toBe(1);
    });
  });
});

describe("WebSocketHub - Broadcasting", () => {
  let hub: WebSocketHub;
  let connectionHandler: (ws: WebSocket) => void;

  function createMockWs(readyState: number = WebSocket.OPEN): jest.Mocked<Partial<WebSocket>> {
    let messageHandler: (data: Buffer) => void;

    const ws: jest.Mocked<Partial<WebSocket>> = {
      on: jest.fn((event: string, handler: unknown) => {
        if (event === "message") messageHandler = handler as (data: Buffer) => void;
        return ws as WebSocket;
      }),
      send: jest.fn(),
      ping: jest.fn(),
      terminate: jest.fn(),
      readyState,
    };

    // Return with a way to send messages
    return Object.assign(ws, {
      simulateMessage: (data: string) => messageHandler(Buffer.from(data)),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // @ts-expect-error - accessing private static property for testing
    WebSocketHub.instance = undefined;

    mockWssOn.mockImplementation((event: string, handler: unknown) => {
      if (event === "connection") {
        connectionHandler = handler as (ws: WebSocket) => void;
      }
    });

    hub = WebSocketHub.getInstance();
    hub.start();
  });

  afterEach(() => {
    hub.stop();
    jest.useRealTimers();
  });

  describe("broadcast", () => {
    it("should send message to subscribed clients", () => {
      const mockWs = createMockWs();
      connectionHandler(mockWs as unknown as WebSocket);
      (mockWs as { simulateMessage: (data: string) => void }).simulateMessage(
        JSON.stringify({ type: "subscribe", channel: "test" })
      );

      hub.broadcast("test", { type: "show", data: { name: "John" } });

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          channel: "test",
          data: { type: "show", data: { name: "John" } },
        })
      );
    });

    it("should not send to clients not subscribed to channel", () => {
      const mockWs = createMockWs();
      connectionHandler(mockWs as unknown as WebSocket);
      (mockWs as { simulateMessage: (data: string) => void }).simulateMessage(
        JSON.stringify({ type: "subscribe", channel: "other" })
      );

      hub.broadcast("test", { type: "show" });

      // Should not have sent the broadcast (only subscription handling)
      const sendCalls = (mockWs.send as jest.Mock).mock.calls;
      const broadcastCall = sendCalls.find(
        (call) => call[0] && call[0].includes('"channel":"test"')
      );
      expect(broadcastCall).toBeUndefined();
    });

    it("should not send to clients with closed connection", () => {
      const mockWs = createMockWs(WebSocket.CLOSED);
      connectionHandler(mockWs as unknown as WebSocket);
      (mockWs as { simulateMessage: (data: string) => void }).simulateMessage(
        JSON.stringify({ type: "subscribe", channel: "test" })
      );

      hub.broadcast("test", { type: "show" });

      // Find broadcast call (not subscription)
      const sendCalls = (mockWs.send as jest.Mock).mock.calls;
      const broadcastCall = sendCalls.find(
        (call) => call[0] && call[0].includes('"channel":"test"')
      );
      expect(broadcastCall).toBeUndefined();
    });

    it("should broadcast to multiple subscribed clients", () => {
      const mockWs1 = createMockWs();
      const mockWs2 = createMockWs();

      connectionHandler(mockWs1 as unknown as WebSocket);
      connectionHandler(mockWs2 as unknown as WebSocket);

      (mockWs1 as { simulateMessage: (data: string) => void }).simulateMessage(
        JSON.stringify({ type: "subscribe", channel: "shared" })
      );
      (mockWs2 as { simulateMessage: (data: string) => void }).simulateMessage(
        JSON.stringify({ type: "subscribe", channel: "shared" })
      );

      hub.broadcast("shared", { type: "update" });

      expect(mockWs1.send).toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalled();
    });

    it("should handle send errors gracefully", () => {
      const mockWs = createMockWs();
      (mockWs.send as jest.Mock).mockImplementation(() => {
        throw new Error("Send failed");
      });

      connectionHandler(mockWs as unknown as WebSocket);
      (mockWs as { simulateMessage: (data: string) => void }).simulateMessage(
        JSON.stringify({ type: "subscribe", channel: "test" })
      );

      expect(() => {
        hub.broadcast("test", { type: "show" });
      }).not.toThrow();
    });
  });

  describe("sendToClient", () => {
    it("should send message to specific client", () => {
      const mockWs = createMockWs();
      connectionHandler(mockWs as unknown as WebSocket);

      // Get client ID by iterating through clients (via getClientCount verification)
      expect(hub.getClientCount()).toBe(1);

      // Access internal clients for testing
      // @ts-expect-error - accessing private property for testing
      const clients = hub.clients;
      const clientId = Array.from(clients.keys())[0];

      hub.sendToClient(clientId, { type: "direct", data: "hello" });

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "direct", data: "hello" })
      );
    });

    it("should not send to nonexistent client", () => {
      expect(() => {
        hub.sendToClient("nonexistent-id", { type: "test" });
      }).not.toThrow();
    });

    it("should not send to client with closed connection", () => {
      const mockWs = createMockWs(WebSocket.CLOSED);
      connectionHandler(mockWs as unknown as WebSocket);

      // @ts-expect-error - accessing private property for testing
      const clients = hub.clients;
      const clientId = Array.from(clients.keys())[0];

      hub.sendToClient(clientId, { type: "direct" });

      // Send should not have been called for closed connection
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it("should handle send errors gracefully", () => {
      const mockWs = createMockWs();
      (mockWs.send as jest.Mock).mockImplementation(() => {
        throw new Error("Send failed");
      });

      connectionHandler(mockWs as unknown as WebSocket);

      // @ts-expect-error - accessing private property for testing
      const clients = hub.clients;
      const clientId = Array.from(clients.keys())[0];

      expect(() => {
        hub.sendToClient(clientId, { type: "test" });
      }).not.toThrow();
    });
  });
});

describe("WebSocketHub - Heartbeat Mechanism", () => {
  let hub: WebSocketHub;
  let connectionHandler: (ws: WebSocket) => void;
  let mockWs: jest.Mocked<Partial<WebSocket>>;
  let pongHandler: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // @ts-expect-error - accessing private static property for testing
    WebSocketHub.instance = undefined;

    mockWs = {
      on: jest.fn((event: string, handler: unknown) => {
        if (event === "pong") pongHandler = handler as () => void;
        return mockWs as WebSocket;
      }),
      send: jest.fn(),
      ping: jest.fn(),
      terminate: jest.fn(),
      readyState: WebSocket.OPEN,
    };

    mockWssOn.mockImplementation((event: string, handler: unknown) => {
      if (event === "connection") {
        connectionHandler = handler as (ws: WebSocket) => void;
      }
    });

    hub = WebSocketHub.getInstance();
    hub.start();
    connectionHandler(mockWs as unknown as WebSocket);
  });

  afterEach(() => {
    hub.stop();
    jest.useRealTimers();
  });

  it("should ping clients at heartbeat interval", () => {
    // Advance timer by heartbeat interval
    jest.advanceTimersByTime(WEBSOCKET.HEARTBEAT_INTERVAL_MS);

    expect(mockWs.ping).toHaveBeenCalled();
  });

  it("should terminate client that does not respond to ping", () => {
    // First heartbeat - marks client as not alive and pings
    jest.advanceTimersByTime(WEBSOCKET.HEARTBEAT_INTERVAL_MS);
    expect(mockWs.ping).toHaveBeenCalledTimes(1);

    // Second heartbeat - client still not alive (no pong received), should terminate
    jest.advanceTimersByTime(WEBSOCKET.HEARTBEAT_INTERVAL_MS);

    expect(mockWs.terminate).toHaveBeenCalled();
  });

  it("should keep client alive if pong received", () => {
    // First heartbeat
    jest.advanceTimersByTime(WEBSOCKET.HEARTBEAT_INTERVAL_MS);
    expect(mockWs.ping).toHaveBeenCalledTimes(1);

    // Simulate pong response
    pongHandler();

    // Second heartbeat - client should still be alive
    jest.advanceTimersByTime(WEBSOCKET.HEARTBEAT_INTERVAL_MS);

    expect(mockWs.terminate).not.toHaveBeenCalled();
    expect(mockWs.ping).toHaveBeenCalledTimes(2);
  });

  it("should remove terminated clients from clients map", () => {
    expect(hub.getClientCount()).toBe(1);

    // First heartbeat
    jest.advanceTimersByTime(WEBSOCKET.HEARTBEAT_INTERVAL_MS);

    // Second heartbeat - terminates dead client
    jest.advanceTimersByTime(WEBSOCKET.HEARTBEAT_INTERVAL_MS);

    expect(hub.getClientCount()).toBe(0);
  });
});

describe("WebSocketHub - Room System", () => {
  let hub: WebSocketHub;
  let connectionHandler: (ws: WebSocket) => void;
  let mockWs: jest.Mocked<Partial<WebSocket>>;
  let messageHandler: (data: Buffer) => void;
  let closeHandler: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // @ts-expect-error - accessing private static property for testing
    WebSocketHub.instance = undefined;

    mockWs = {
      on: jest.fn((event: string, handler: unknown) => {
        if (event === "message") messageHandler = handler as (data: Buffer) => void;
        if (event === "close") closeHandler = handler as () => void;
        return mockWs as WebSocket;
      }),
      send: jest.fn(),
      ping: jest.fn(),
      terminate: jest.fn(),
      readyState: WebSocket.OPEN,
    };

    mockWssOn.mockImplementation((event: string, handler: unknown) => {
      if (event === "connection") {
        connectionHandler = handler as (ws: WebSocket) => void;
      }
    });

    hub = WebSocketHub.getInstance();
    hub.start();
    connectionHandler(mockWs as unknown as WebSocket);
  });

  afterEach(() => {
    hub.stop();
    jest.useRealTimers();
  });

  describe("join-room", () => {
    it("should subscribe client to room channel on join", () => {
      const roomId = "00000000-0000-0000-0000-000000000001";
      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.PRESENTER })
        )
      );

      expect(hub.getChannelSubscribers(`room:${roomId}`)).toBe(1);
    });

    it("should update room presence on join", () => {
      const roomId = "00000000-0000-0000-0000-000000000001";
      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.PRESENTER })
        )
      );

      const presence = hub.getPresence(roomId);

      expect(presence).toHaveLength(1);
      expect(presence[0].role).toBe(RoomRole.PRESENTER);
      expect(presence[0].isOnline).toBe(true);
    });

    it("should broadcast presence update to room", () => {
      const roomId = "00000000-0000-0000-0000-000000000001";
      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.CONTROL })
        )
      );

      // Should have sent presence broadcast
      expect(mockWs.send).toHaveBeenCalled();
      const sendCalls = (mockWs.send as jest.Mock).mock.calls;
      const presenceCall = sendCalls.find((call) =>
        call[0].includes('"type":"presence"')
      );
      expect(presenceCall).toBeDefined();
    });

    it("should trigger onRoomJoinCallback if set", () => {
      const roomId = "00000000-0000-0000-0000-000000000001";
      const callback = jest.fn();
      hub.setOnRoomJoinCallback(callback);

      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.PRESENTER })
        )
      );

      expect(callback).toHaveBeenCalledWith(
        roomId,
        expect.any(String),
        RoomRole.PRESENTER
      );
    });

    it("should leave previous room when joining new room", () => {
      const room1 = "00000000-0000-0000-0000-000000000001";
      const room2 = "00000000-0000-0000-0000-000000000002";

      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId: room1, role: RoomRole.PRESENTER })
        )
      );
      expect(hub.getChannelSubscribers(`room:${room1}`)).toBe(1);

      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId: room2, role: RoomRole.PRESENTER })
        )
      );

      expect(hub.getChannelSubscribers(`room:${room1}`)).toBe(0);
      expect(hub.getChannelSubscribers(`room:${room2}`)).toBe(1);
    });

    it("should ignore join-room without roomId or role", () => {
      messageHandler(Buffer.from(JSON.stringify({ type: "join-room" })));

      // Should not throw or create presence
      expect(hub.getPresence("undefined")).toHaveLength(0);
    });
  });

  describe("leave-room", () => {
    const roomId = "00000000-0000-0000-0000-000000000001";

    beforeEach(() => {
      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.PRESENTER })
        )
      );
    });

    it("should unsubscribe client from room channel", () => {
      expect(hub.getChannelSubscribers(`room:${roomId}`)).toBe(1);

      messageHandler(Buffer.from(JSON.stringify({ type: "leave-room", roomId })));

      expect(hub.getChannelSubscribers(`room:${roomId}`)).toBe(0);
    });

    it("should remove from room presence", () => {
      expect(hub.getPresence(roomId)).toHaveLength(1);

      messageHandler(Buffer.from(JSON.stringify({ type: "leave-room", roomId })));

      expect(hub.getPresence(roomId)).toHaveLength(0);
    });

    it("should broadcast presence update after leaving", () => {
      // Add a second client to the room that will receive the presence update
      const mockWs2 = {
        on: jest.fn((event: string, handler: unknown) => {
          if (event === "message") {
            (handler as (data: Buffer) => void)(
              Buffer.from(
                JSON.stringify({ type: "join-room", roomId, role: RoomRole.CONTROL })
              )
            );
          }
          return mockWs2 as unknown as WebSocket;
        }),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn(),
        readyState: WebSocket.OPEN,
      };
      connectionHandler(mockWs2 as unknown as WebSocket);

      (mockWs2.send as jest.Mock).mockClear();

      // First client leaves, second client should receive presence update
      messageHandler(Buffer.from(JSON.stringify({ type: "leave-room", roomId })));

      expect(mockWs2.send).toHaveBeenCalled();
      const sendCalls = (mockWs2.send as jest.Mock).mock.calls;
      const presenceCall = sendCalls.find((call) =>
        call[0].includes('"type":"presence"')
      );
      expect(presenceCall).toBeDefined();
    });

    it("should ignore leave-room without roomId", () => {
      expect(() => {
        messageHandler(Buffer.from(JSON.stringify({ type: "leave-room" })));
      }).not.toThrow();
    });
  });

  describe("client disconnect - room cleanup", () => {
    it("should remove from room on disconnect", () => {
      const roomId = "00000000-0000-0000-0000-000000000001";
      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.PRESENTER })
        )
      );
      expect(hub.getPresence(roomId)).toHaveLength(1);

      closeHandler();

      expect(hub.getPresence(roomId)).toHaveLength(0);
    });
  });

  describe("getPresence", () => {
    it("should return empty array for unknown room", () => {
      expect(hub.getPresence("unknown-room")).toEqual([]);
    });

    it("should return all clients in room", () => {
      const roomId = "00000000-0000-0000-0000-000000000001";

      // Connect first client as presenter
      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.PRESENTER })
        )
      );

      // Connect second client as control
      const mockWs2 = {
        on: jest.fn((event: string, handler: unknown) => {
          if (event === "message") {
            (handler as (data: Buffer) => void)(
              Buffer.from(
                JSON.stringify({ type: "join-room", roomId, role: RoomRole.CONTROL })
              )
            );
          }
          return mockWs2 as unknown as WebSocket;
        }),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn(),
        readyState: WebSocket.OPEN,
      };
      connectionHandler(mockWs2 as unknown as WebSocket);

      const presence = hub.getPresence(roomId);

      expect(presence).toHaveLength(2);
      expect(presence.map((p) => p.role)).toContain(RoomRole.PRESENTER);
      expect(presence.map((p) => p.role)).toContain(RoomRole.CONTROL);
    });
  });

  describe("broadcastPresence", () => {
    it("should broadcast presence to room channel", () => {
      const roomId = "00000000-0000-0000-0000-000000000001";
      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.PRESENTER })
        )
      );
      (mockWs.send as jest.Mock).mockClear();

      hub.broadcastPresence(roomId);

      expect(mockWs.send).toHaveBeenCalled();
      const sentData = JSON.parse((mockWs.send as jest.Mock).mock.calls[0][0]);
      expect(sentData.channel).toBe(`room:${roomId}`);
      expect(sentData.data.type).toBe("presence");
      expect(sentData.data.roomId).toBe(roomId);
    });
  });

  describe("sendReplay", () => {
    it("should send replay data to specific client", () => {
      const roomId = "00000000-0000-0000-0000-000000000001";
      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.PRESENTER })
        )
      );
      (mockWs.send as jest.Mock).mockClear();

      // @ts-expect-error - accessing private property for testing
      const clientId = Array.from(hub.clients.keys())[0];

      const messages = [{ id: "msg1", body: "Test" }];
      const pinnedMessages = [{ id: "pin1", body: "Pinned" }];

      hub.sendReplay(clientId, roomId, messages, pinnedMessages);

      expect(mockWs.send).toHaveBeenCalled();
      const sentData = JSON.parse((mockWs.send as jest.Mock).mock.calls[0][0]);
      expect(sentData.type).toBe("replay");
      expect(sentData.roomId).toBe(roomId);
      expect(sentData.messages).toEqual(messages);
      expect(sentData.pinnedMessages).toEqual(pinnedMessages);
      expect(sentData.presence).toBeDefined();
    });
  });

  describe("presence-ping", () => {
    it("should update last activity on presence ping", () => {
      const roomId = "00000000-0000-0000-0000-000000000001";
      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.PRESENTER })
        )
      );

      const presenceBefore = hub.getPresence(roomId)[0];
      const lastActivityBefore = presenceBefore.lastActivity;

      // Advance time
      jest.advanceTimersByTime(1000);

      messageHandler(Buffer.from(JSON.stringify({ type: "presence-ping" })));

      const presenceAfter = hub.getPresence(roomId)[0];
      expect(presenceAfter.lastActivity).toBeGreaterThan(lastActivityBefore || 0);
    });
  });

  describe("cue-action", () => {
    it("should update client last activity on cue action", () => {
      const roomId = "00000000-0000-0000-0000-000000000001";
      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "join-room", roomId, role: RoomRole.PRESENTER })
        )
      );

      const presenceBefore = hub.getPresence(roomId)[0];
      const lastActivityBefore = presenceBefore.lastActivity;

      jest.advanceTimersByTime(1000);

      messageHandler(
        Buffer.from(
          JSON.stringify({ type: "cue-action", messageId: "msg1", action: "ack" })
        )
      );

      const presenceAfter = hub.getPresence(roomId)[0];
      expect(presenceAfter.lastActivity).toBeGreaterThan(lastActivityBefore || 0);
    });

    it("should ignore cue-action without messageId or action", () => {
      expect(() => {
        messageHandler(Buffer.from(JSON.stringify({ type: "cue-action" })));
      }).not.toThrow();
    });
  });
});

describe("WebSocketHub - setOnRoomJoinCallback", () => {
  let hub: WebSocketHub;

  beforeEach(() => {
    jest.clearAllMocks();

    // @ts-expect-error - accessing private static property for testing
    WebSocketHub.instance = undefined;

    hub = WebSocketHub.getInstance();
  });

  afterEach(() => {
    hub.stop();
  });

  it("should store callback for room join events", () => {
    const callback = jest.fn();
    hub.setOnRoomJoinCallback(callback);

    // @ts-expect-error - accessing private property for testing
    expect(hub.onRoomJoinCallback).toBe(callback);
  });

  it("should allow replacing callback", () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    hub.setOnRoomJoinCallback(callback1);
    hub.setOnRoomJoinCallback(callback2);

    // @ts-expect-error - accessing private property for testing
    expect(hub.onRoomJoinCallback).toBe(callback2);
  });
});
