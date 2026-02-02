import { CueMessageRepository } from "@/lib/repositories/CueMessageRepository";
import type { DbCueMessage, DbCueMessageInput, DbCueMessageUpdate } from "@/lib/models/Database";

// Mock Logger to avoid side effects
jest.mock("@/lib/utils/Logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock statement and db
const mockStmt = {
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};

const mockDb = {
  prepare: jest.fn(() => mockStmt),
};

// Mock DatabaseConnector
jest.mock("@/lib/services/DatabaseConnector", () => ({
  DatabaseConnector: {
    getInstance: jest.fn(() => ({
      getDb: jest.fn(() => mockDb),
    })),
  },
}));

describe("CueMessageRepository", () => {
  let repository: CueMessageRepository;

  // Sample raw database row (SQLite format with numeric boolean and JSON strings)
  const mockRawMessage = {
    id: "msg-1",
    type: "cue",
    fromRole: "host",
    severity: "info",
    title: "Test Cue",
    body: "This is a test cue message",
    pinned: 0,
    actions: "[]",
    countdownPayload: null,
    contextPayload: null,
    questionPayload: null,
    seenBy: "[]",
    ackedBy: "[]",
    resolvedAt: null,
    resolvedBy: null,
    createdAt: 1705312800000,
    updatedAt: 1705312800000,
  };

  // Expected transformed message (JavaScript format with boolean and parsed JSON)
  const expectedMessage: DbCueMessage = {
    id: "msg-1",
    type: "cue",
    fromRole: "host",
    severity: "info",
    title: "Test Cue",
    body: "This is a test cue message",
    pinned: false,
    actions: [],
    countdownPayload: null,
    contextPayload: null,
    questionPayload: null,
    seenBy: [],
    ackedBy: [],
    resolvedAt: null,
    resolvedBy: null,
    createdAt: 1705312800000,
    updatedAt: 1705312800000,
  };

  beforeEach(() => {
    // Reset singleton instance for isolation
    (CueMessageRepository as unknown as { instance: CueMessageRepository | undefined }).instance = undefined;
    repository = CueMessageRepository.getInstance();
    jest.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = CueMessageRepository.getInstance();
      const instance2 = CueMessageRepository.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create a new instance if none exists", () => {
      (CueMessageRepository as unknown as { instance: CueMessageRepository | undefined }).instance = undefined;
      const instance = CueMessageRepository.getInstance();

      expect(instance).toBeInstanceOf(CueMessageRepository);
    });
  });

  describe("getRecent", () => {
    it("should return recent messages with default limit", () => {
      mockStmt.all.mockReturnValue([mockRawMessage]);

      const messages = repository.getRecent();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM cue_messages ORDER BY createdAt DESC LIMIT ?"
      );
      expect(mockStmt.all).toHaveBeenCalledWith(50);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(expectedMessage);
    });

    it("should use custom limit", () => {
      mockStmt.all.mockReturnValue([]);

      repository.getRecent(10);

      expect(mockStmt.all).toHaveBeenCalledWith(10);
    });

    it("should use cursor for pagination", () => {
      mockStmt.all.mockReturnValue([]);

      repository.getRecent(50, 1705312700000);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM cue_messages WHERE createdAt < ? ORDER BY createdAt DESC LIMIT ?"
      );
      expect(mockStmt.all).toHaveBeenCalledWith(1705312700000, 50);
    });

    it("should return empty array when no messages exist", () => {
      mockStmt.all.mockReturnValue([]);

      const messages = repository.getRecent();

      expect(messages).toEqual([]);
    });

    it("should parse JSON actions field correctly", () => {
      mockStmt.all.mockReturnValue([{
        ...mockRawMessage,
        actions: '["action1", "action2"]',
      }]);

      const messages = repository.getRecent();

      expect(messages[0].actions).toEqual(["action1", "action2"]);
    });

    it("should parse JSON seenBy and ackedBy fields correctly", () => {
      mockStmt.all.mockReturnValue([{
        ...mockRawMessage,
        seenBy: '["user1", "user2"]',
        ackedBy: '["user1"]',
      }]);

      const messages = repository.getRecent();

      expect(messages[0].seenBy).toEqual(["user1", "user2"]);
      expect(messages[0].ackedBy).toEqual(["user1"]);
    });

    it("should parse JSON payload fields correctly", () => {
      mockStmt.all.mockReturnValue([{
        ...mockRawMessage,
        countdownPayload: '{"duration": 60}',
        contextPayload: '{"context": "test"}',
        questionPayload: '{"question": "What?"}',
      }]);

      const messages = repository.getRecent();

      expect(messages[0].countdownPayload).toEqual({ duration: 60 });
      expect(messages[0].contextPayload).toEqual({ context: "test" });
      expect(messages[0].questionPayload).toEqual({ question: "What?" });
    });

    it("should transform pinned from 1 to true", () => {
      mockStmt.all.mockReturnValue([{ ...mockRawMessage, pinned: 1 }]);

      const messages = repository.getRecent();

      expect(messages[0].pinned).toBe(true);
    });

    it("should transform pinned from 0 to false", () => {
      mockStmt.all.mockReturnValue([{ ...mockRawMessage, pinned: 0 }]);

      const messages = repository.getRecent();

      expect(messages[0].pinned).toBe(false);
    });
  });

  describe("getPinned", () => {
    it("should return only pinned messages", () => {
      const pinnedRaw = { ...mockRawMessage, pinned: 1 };
      mockStmt.all.mockReturnValue([pinnedRaw]);

      const messages = repository.getPinned();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM cue_messages WHERE pinned = 1 ORDER BY createdAt DESC"
      );
      expect(mockStmt.all).toHaveBeenCalled();
      expect(messages).toHaveLength(1);
      expect(messages[0].pinned).toBe(true);
    });

    it("should return empty array when no pinned messages exist", () => {
      mockStmt.all.mockReturnValue([]);

      const messages = repository.getPinned();

      expect(messages).toEqual([]);
    });
  });

  describe("getById", () => {
    it("should return transformed message when found", () => {
      mockStmt.get.mockReturnValue(mockRawMessage);

      const message = repository.getById("msg-1");

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM cue_messages WHERE id = ?"
      );
      expect(mockStmt.get).toHaveBeenCalledWith("msg-1");
      expect(message).toEqual(expectedMessage);
    });

    it("should return null when message not found", () => {
      mockStmt.get.mockReturnValue(undefined);

      const message = repository.getById("non-existent");

      expect(message).toBeNull();
    });
  });

  describe("create", () => {
    it("should create message without roomId", () => {
      const input: DbCueMessageInput = {
        id: "new-msg",
        type: "cue",
        fromRole: "host",
        severity: "info",
        title: "New Cue",
        body: "Test body",
        pinned: false,
        actions: ["reply"],
        countdownPayload: null,
        contextPayload: null,
        questionPayload: null,
        seenBy: [],
        ackedBy: [],
        resolvedAt: null,
        resolvedBy: null,
      };

      // Mock getById to return the created message
      mockStmt.get.mockReturnValue({
        ...mockRawMessage,
        id: "new-msg",
        title: "New Cue",
        body: "Test body",
        actions: '["reply"]',
      });

      const result = repository.create(input);

      // Verify INSERT statement does NOT contain roomId
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO cue_messages"));
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.not.stringContaining("roomId")
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("id, type, fromRole, severity, title, body, pinned, actions")
      );

      // Verify the run was called with correct values
      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-msg",
        "cue",
        "host",
        "info",
        "New Cue",
        "Test body",
        0, // pinned converted to 0
        '["reply"]', // actions JSON
        null, // countdownPayload
        null, // contextPayload
        null, // questionPayload
        "[]", // seenBy JSON
        "[]", // ackedBy JSON
        null, // resolvedAt
        null, // resolvedBy
        expect.any(Number), // createdAt
        expect.any(Number)  // updatedAt
      );

      expect(result).toBeDefined();
    });

    it("should convert pinned true to 1", () => {
      const input: DbCueMessageInput = {
        id: "new-msg",
        type: "cue",
        fromRole: "host",
        severity: null,
        title: null,
        body: null,
        pinned: true,
        actions: [],
        countdownPayload: null,
        contextPayload: null,
        questionPayload: null,
        seenBy: [],
        ackedBy: [],
        resolvedAt: null,
        resolvedBy: null,
      };

      mockStmt.get.mockReturnValue({ ...mockRawMessage, pinned: 1 });

      repository.create(input);

      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-msg",          // id
        "cue",              // type
        "host",             // fromRole
        null,               // severity
        null,               // title
        null,               // body
        1,                  // pinned converted to 1
        "[]",               // actions
        null,               // countdownPayload
        null,               // contextPayload
        null,               // questionPayload
        "[]",               // seenBy
        "[]",               // ackedBy
        null,               // resolvedAt
        null,               // resolvedBy
        expect.any(Number), // createdAt
        expect.any(Number)  // updatedAt
      );
    });

    it("should use provided timestamps", () => {
      const input: DbCueMessageInput = {
        id: "new-msg",
        type: "cue",
        fromRole: "host",
        severity: null,
        title: null,
        body: null,
        pinned: false,
        actions: [],
        countdownPayload: null,
        contextPayload: null,
        questionPayload: null,
        seenBy: [],
        ackedBy: [],
        resolvedAt: null,
        resolvedBy: null,
        createdAt: 1000000000000,
        updatedAt: 1000000000000,
      };

      mockStmt.get.mockReturnValue(mockRawMessage);

      repository.create(input);

      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-msg",
        "cue",
        "host",
        null,
        null,
        null,
        0,
        "[]",
        null,
        null,
        null,
        "[]",
        "[]",
        null,
        null,
        1000000000000, // createdAt
        1000000000000  // updatedAt
      );
    });

    it("should serialize payload objects to JSON", () => {
      const input: DbCueMessageInput = {
        id: "new-msg",
        type: "countdown",
        fromRole: "host",
        severity: null,
        title: null,
        body: null,
        pinned: false,
        actions: [],
        countdownPayload: { duration: 60, label: "Break" },
        contextPayload: { topic: "Interview" },
        questionPayload: { text: "What is your name?" },
        seenBy: [],
        ackedBy: [],
        resolvedAt: null,
        resolvedBy: null,
      };

      mockStmt.get.mockReturnValue(mockRawMessage);

      repository.create(input);

      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-msg",
        "countdown",
        "host",
        null,
        null,
        null,
        0,
        "[]",
        '{"duration":60,"label":"Break"}',
        '{"topic":"Interview"}',
        '{"text":"What is your name?"}',
        "[]",
        "[]",
        null,
        null,
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe("update", () => {
    it("should throw error when message not found", () => {
      mockStmt.get.mockReturnValue(undefined);

      expect(() => repository.update("non-existent", { title: "Updated" })).toThrow(
        "Message with id non-existent not found"
      );
    });

    it("should merge updates with existing message data", () => {
      mockStmt.get.mockReturnValue(mockRawMessage);

      repository.update("msg-1", { title: "Updated Title" });

      expect(mockStmt.run).toHaveBeenCalledWith(
        "cue",              // type unchanged
        "host",             // fromRole unchanged
        "info",             // severity unchanged
        "Updated Title",    // title updated
        "This is a test cue message", // body unchanged
        0,                  // pinned unchanged
        "[]",               // actions unchanged
        null,               // countdownPayload unchanged
        null,               // contextPayload unchanged
        null,               // questionPayload unchanged
        "[]",               // seenBy unchanged
        "[]",               // ackedBy unchanged
        null,               // resolvedAt unchanged
        null,               // resolvedBy unchanged
        expect.any(Number), // updatedAt
        "msg-1"             // id
      );
    });

    it("should convert pinned boolean to number on update", () => {
      mockStmt.get.mockReturnValue(mockRawMessage);

      repository.update("msg-1", { pinned: true });

      expect(mockStmt.run).toHaveBeenCalledWith(
        "cue",                           // type unchanged
        "host",                          // fromRole unchanged
        "info",                          // severity unchanged
        "Test Cue",                      // title unchanged
        "This is a test cue message",    // body unchanged
        1,                               // pinned converted to 1
        "[]",                            // actions unchanged
        null,                            // countdownPayload unchanged
        null,                            // contextPayload unchanged
        null,                            // questionPayload unchanged
        "[]",                            // seenBy unchanged
        "[]",                            // ackedBy unchanged
        null,                            // resolvedAt unchanged
        null,                            // resolvedBy unchanged
        expect.any(Number),              // updatedAt
        "msg-1"                          // id
      );
    });

    it("should update seenBy and ackedBy arrays", () => {
      mockStmt.get.mockReturnValue(mockRawMessage);

      repository.update("msg-1", {
        seenBy: ["user1", "user2"],
        ackedBy: ["user1"],
      });

      expect(mockStmt.run).toHaveBeenCalledWith(
        "cue",                           // type unchanged
        "host",                          // fromRole unchanged
        "info",                          // severity unchanged
        "Test Cue",                      // title unchanged
        "This is a test cue message",    // body unchanged
        0,                               // pinned unchanged
        "[]",                            // actions unchanged
        null,                            // countdownPayload unchanged
        null,                            // contextPayload unchanged
        null,                            // questionPayload unchanged
        '["user1","user2"]',             // seenBy updated
        '["user1"]',                     // ackedBy updated
        null,                            // resolvedAt unchanged
        null,                            // resolvedBy unchanged
        expect.any(Number),              // updatedAt
        "msg-1"                          // id
      );
    });

    it("should update resolvedAt and resolvedBy", () => {
      mockStmt.get.mockReturnValue(mockRawMessage);
      const resolvedTime = 1705400000000; // Fixed timestamp for test stability

      repository.update("msg-1", {
        resolvedAt: resolvedTime,
        resolvedBy: "admin",
      });

      expect(mockStmt.run).toHaveBeenCalledWith(
        "cue",                           // type unchanged
        "host",                          // fromRole unchanged
        "info",                          // severity unchanged
        "Test Cue",                      // title unchanged
        "This is a test cue message",    // body unchanged
        0,                               // pinned unchanged
        "[]",                            // actions unchanged
        null,                            // countdownPayload unchanged
        null,                            // contextPayload unchanged
        null,                            // questionPayload unchanged
        "[]",                            // seenBy unchanged
        "[]",                            // ackedBy unchanged
        resolvedTime,                    // resolvedAt updated
        "admin",                         // resolvedBy updated
        expect.any(Number),              // updatedAt
        "msg-1"                          // id
      );
    });
  });

  describe("delete", () => {
    it("should prepare correct DELETE SQL statement", () => {
      repository.delete("msg-1");

      expect(mockDb.prepare).toHaveBeenCalledWith("DELETE FROM cue_messages WHERE id = ?");
    });

    it("should run delete with correct id", () => {
      repository.delete("msg-1");

      expect(mockStmt.run).toHaveBeenCalledWith("msg-1");
    });

    it("should not throw when deleting non-existent message", () => {
      expect(() => repository.delete("non-existent")).not.toThrow();
    });
  });

  describe("deleteOld", () => {
    it("should delete old messages keeping recent ones", () => {
      mockStmt.get.mockReturnValue({ createdAt: 1705000000000 });

      repository.deleteOld(100);

      // First call to get the cutoff
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SELECT createdAt FROM cue_messages")
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY createdAt DESC")
      );

      // Second call to delete
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM cue_messages")
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("WHERE pinned = 0 AND createdAt < ?")
      );
    });

    it("should not delete if fewer messages than keepCount", () => {
      mockStmt.get.mockReturnValue(undefined);

      repository.deleteOld(100);

      // Should not call delete since no cutoff row was found
      const deleteCalls = mockDb.prepare.mock.calls.filter(
        (call: [string]) => call[0].includes("DELETE")
      );
      expect(deleteCalls).toHaveLength(0);
    });

    it("should preserve pinned messages when deleting old", () => {
      mockStmt.get.mockReturnValue({ createdAt: 1705000000000 });

      repository.deleteOld(50);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("WHERE pinned = 0")
      );
    });
  });

  describe("clearAll", () => {
    it("should delete all messages", () => {
      repository.clearAll();

      expect(mockDb.prepare).toHaveBeenCalledWith("DELETE FROM cue_messages");
      expect(mockStmt.run).toHaveBeenCalled();
    });

    it("should not throw when table is empty", () => {
      expect(() => repository.clearAll()).not.toThrow();
    });
  });
});
