import { GuestRepository } from "@/lib/repositories/GuestRepository";
import type { DbGuest, DbGuestInput } from "@/lib/models/Database";

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

describe("GuestRepository", () => {
  let repository: GuestRepository;

  // Sample raw database row (SQLite format with numeric boolean and string dates)
  const mockRawGuest = {
    id: "guest-1",
    displayName: "John Doe",
    subtitle: "Developer",
    accentColor: "#ff0000",
    avatarUrl: "/uploads/avatar.jpg",
    chatMessage: "Hello!",
    isEnabled: 1,
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T12:00:00.000Z",
  };

  // Expected transformed guest (JavaScript format with boolean and Date objects)
  const expectedGuest: DbGuest = {
    id: "guest-1",
    displayName: "John Doe",
    subtitle: "Developer",
    accentColor: "#ff0000",
    avatarUrl: "/uploads/avatar.jpg",
    chatMessage: "Hello!",
    isEnabled: true,
    createdAt: new Date("2024-01-15T10:00:00.000Z"),
    updatedAt: new Date("2024-01-15T12:00:00.000Z"),
  };

  beforeEach(() => {
    // Reset singleton instance for isolation
    (GuestRepository as unknown as { instance: GuestRepository | undefined }).instance = undefined;
    repository = GuestRepository.getInstance();
    jest.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = GuestRepository.getInstance();
      const instance2 = GuestRepository.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create a new instance if none exists", () => {
      (GuestRepository as unknown as { instance: GuestRepository | undefined }).instance = undefined;
      const instance = GuestRepository.getInstance();

      expect(instance).toBeInstanceOf(GuestRepository);
    });
  });

  describe("getAll", () => {
    it("should return all guests with transformed boolean and date fields", () => {
      const mockRawGuests = [
        mockRawGuest,
        {
          ...mockRawGuest,
          id: "guest-2",
          displayName: "Jane Doe",
          isEnabled: 0,
        },
      ];
      mockStmt.all.mockReturnValue(mockRawGuests);

      const guests = repository.getAll();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM guests ORDER BY displayName ASC"
      );
      expect(mockStmt.all).toHaveBeenCalled();
      expect(guests).toHaveLength(2);
      expect(guests[0].isEnabled).toBe(true);
      expect(guests[0].createdAt).toBeInstanceOf(Date);
      expect(guests[0].updatedAt).toBeInstanceOf(Date);
      expect(guests[1].isEnabled).toBe(false);
    });

    it("should return empty array when no guests exist", () => {
      mockStmt.all.mockReturnValue([]);

      const guests = repository.getAll();

      expect(guests).toEqual([]);
    });

    it("should correctly transform isEnabled from 1 to true", () => {
      mockStmt.all.mockReturnValue([{ ...mockRawGuest, isEnabled: 1 }]);

      const guests = repository.getAll();

      expect(guests[0].isEnabled).toBe(true);
    });

    it("should correctly transform isEnabled from 0 to false", () => {
      mockStmt.all.mockReturnValue([{ ...mockRawGuest, isEnabled: 0 }]);

      const guests = repository.getAll();

      expect(guests[0].isEnabled).toBe(false);
    });

    it("should correctly transform createdAt string to Date object", () => {
      mockStmt.all.mockReturnValue([mockRawGuest]);

      const guests = repository.getAll();

      expect(guests[0].createdAt).toEqual(new Date("2024-01-15T10:00:00.000Z"));
    });

    it("should correctly transform updatedAt string to Date object", () => {
      mockStmt.all.mockReturnValue([mockRawGuest]);

      const guests = repository.getAll();

      expect(guests[0].updatedAt).toEqual(new Date("2024-01-15T12:00:00.000Z"));
    });
  });

  describe("getById", () => {
    it("should return transformed guest when found", () => {
      mockStmt.get.mockReturnValue(mockRawGuest);

      const guest = repository.getById("guest-1");

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM guests WHERE id = ?"
      );
      expect(mockStmt.get).toHaveBeenCalledWith("guest-1");
      expect(guest).toEqual(expectedGuest);
    });

    it("should return null when guest not found", () => {
      mockStmt.get.mockReturnValue(undefined);

      const guest = repository.getById("non-existent");

      expect(guest).toBeNull();
    });

    it("should transform isEnabled boolean correctly", () => {
      mockStmt.get.mockReturnValue({ ...mockRawGuest, isEnabled: 0 });

      const guest = repository.getById("guest-1");

      expect(guest?.isEnabled).toBe(false);
    });

    it("should transform date fields correctly", () => {
      mockStmt.get.mockReturnValue(mockRawGuest);

      const guest = repository.getById("guest-1");

      expect(guest?.createdAt).toBeInstanceOf(Date);
      expect(guest?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("create", () => {
    it("should prepare correct INSERT SQL statement", () => {
      const input: DbGuestInput = {
        id: "new-guest",
        displayName: "New Guest",
        subtitle: "Subtitle",
        accentColor: "#00ff00",
        avatarUrl: "/uploads/new.jpg",
        chatMessage: "Hi!",
        isEnabled: true,
      };

      repository.create(input);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO guests"));
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("id, displayName, subtitle, accentColor, avatarUrl, chatMessage, isEnabled, createdAt, updatedAt")
      );
    });

    it("should run with correct values and transformed isEnabled", () => {
      const input: DbGuestInput = {
        id: "new-guest",
        displayName: "New Guest",
        subtitle: "Subtitle",
        accentColor: "#00ff00",
        avatarUrl: "/uploads/new.jpg",
        chatMessage: "Hi!",
        isEnabled: true,
      };

      repository.create(input);

      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-guest",
        "New Guest",
        "Subtitle",
        "#00ff00",
        "/uploads/new.jpg",
        "Hi!",
        1, // isEnabled transformed to 1
        expect.any(String), // createdAt ISO string
        expect.any(String)  // updatedAt ISO string
      );
    });

    it("should convert isEnabled false to 0", () => {
      const input: DbGuestInput = {
        id: "new-guest",
        displayName: "New Guest",
        subtitle: null,
        accentColor: "#00ff00",
        avatarUrl: null,
        chatMessage: null,
        isEnabled: false,
      };

      repository.create(input);

      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-guest",
        "New Guest",
        null,
        "#00ff00",
        null,
        null,
        0, // isEnabled transformed to 0
        expect.any(String),
        expect.any(String)
      );
    });

    it("should use provided createdAt and updatedAt dates", () => {
      const specificDate = new Date("2024-06-01T15:30:00.000Z");
      const input: DbGuestInput = {
        id: "new-guest",
        displayName: "New Guest",
        subtitle: null,
        accentColor: "#00ff00",
        avatarUrl: null,
        chatMessage: null,
        isEnabled: true,
        createdAt: specificDate,
        updatedAt: specificDate,
      };

      repository.create(input);

      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-guest",
        "New Guest",
        null,
        "#00ff00",
        null,
        null,
        1,
        "2024-06-01T15:30:00.000Z",
        "2024-06-01T15:30:00.000Z"
      );
    });

    it("should convert undefined optional fields to null", () => {
      const input = {
        id: "new-guest",
        displayName: "New Guest",
        subtitle: undefined,
        accentColor: "#00ff00",
        avatarUrl: undefined,
        chatMessage: undefined,
        isEnabled: true,
      } as DbGuestInput;

      repository.create(input);

      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-guest",
        "New Guest",
        null,
        "#00ff00",
        null,
        null,
        1,
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe("update", () => {
    it("should throw error when guest not found", () => {
      mockStmt.get.mockReturnValue(undefined);

      expect(() => repository.update("non-existent", { displayName: "Updated" })).toThrow(
        "Guest with id non-existent not found"
      );
    });

    it("should merge updates with existing guest data", () => {
      mockStmt.get.mockReturnValue(mockRawGuest);

      repository.update("guest-1", { displayName: "Updated Name" });

      expect(mockStmt.run).toHaveBeenCalledWith(
        "Updated Name",    // updated
        "Developer",       // unchanged from existing
        "#ff0000",         // unchanged
        "/uploads/avatar.jpg", // unchanged
        "Hello!",          // unchanged
        1,                 // isEnabled unchanged
        expect.any(String), // updatedAt
        "guest-1"
      );
    });

    it("should prepare correct UPDATE SQL statement", () => {
      mockStmt.get.mockReturnValue(mockRawGuest);

      repository.update("guest-1", { displayName: "Updated" });

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE guests"));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("WHERE id = ?"));
    });

    it("should convert isEnabled boolean to number on update", () => {
      mockStmt.get.mockReturnValue(mockRawGuest);

      repository.update("guest-1", { isEnabled: false });

      expect(mockStmt.run).toHaveBeenCalledWith(
        "John Doe",
        "Developer",
        "#ff0000",
        "/uploads/avatar.jpg",
        "Hello!",
        0, // isEnabled converted to 0
        expect.any(String),
        "guest-1"
      );
    });

    it("should update multiple fields at once", () => {
      mockStmt.get.mockReturnValue(mockRawGuest);

      repository.update("guest-1", {
        displayName: "New Name",
        subtitle: "New Subtitle",
        accentColor: "#0000ff",
        isEnabled: false,
      });

      expect(mockStmt.run).toHaveBeenCalledWith(
        "New Name",
        "New Subtitle",
        "#0000ff",
        "/uploads/avatar.jpg",
        "Hello!",
        0,
        expect.any(String),
        "guest-1"
      );
    });

    it("should allow setting optional fields to null", () => {
      mockStmt.get.mockReturnValue(mockRawGuest);

      repository.update("guest-1", {
        subtitle: null,
        avatarUrl: null,
        chatMessage: null,
      });

      expect(mockStmt.run).toHaveBeenCalledWith(
        "John Doe",
        null,
        "#ff0000",
        null,
        null,
        1,
        expect.any(String),
        "guest-1"
      );
    });

    it("should use provided updatedAt date", () => {
      mockStmt.get.mockReturnValue(mockRawGuest);
      const specificDate = new Date("2024-12-25T00:00:00.000Z");

      repository.update("guest-1", { updatedAt: specificDate });

      expect(mockStmt.run).toHaveBeenCalledWith(
        "John Doe",
        "Developer",
        "#ff0000",
        "/uploads/avatar.jpg",
        "Hello!",
        1,
        "2024-12-25T00:00:00.000Z",
        "guest-1"
      );
    });
  });

  describe("delete", () => {
    it("should prepare correct DELETE SQL statement", () => {
      repository.delete("guest-1");

      expect(mockDb.prepare).toHaveBeenCalledWith("DELETE FROM guests WHERE id = ?");
    });

    it("should run delete with correct id", () => {
      repository.delete("guest-1");

      expect(mockStmt.run).toHaveBeenCalledWith("guest-1");
    });

    it("should not throw when deleting non-existent guest", () => {
      expect(() => repository.delete("non-existent")).not.toThrow();
    });
  });
});
