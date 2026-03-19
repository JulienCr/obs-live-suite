import { TitleRevealRepository } from "@/lib/repositories/TitleRevealRepository";
import type { DbTitleRevealInput } from "@/lib/models/Database";

// Mock Logger
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

const mockTransaction = jest.fn((fn: () => void) => fn);

const mockDb = {
  prepare: jest.fn(() => mockStmt),
  transaction: jest.fn((fn: () => void) => mockTransaction.mockImplementation(() => fn())),
};

// Mock DatabaseConnector
jest.mock("@/lib/services/DatabaseConnector", () => ({
  DatabaseConnector: {
    getInstance: jest.fn(() => ({
      getDb: jest.fn(() => mockDb),
    })),
  },
}));

describe("TitleRevealRepository", () => {
  let repository: TitleRevealRepository;

  const mockRawTitleReveal = {
    id: "tr-1",
    name: "Episode Title",
    lines: JSON.stringify([
      { text: "Hello", fontSize: 80, alignment: "l", offsetX: 0, offsetY: 0 },
    ]),
    logoUrl: null,
    fontFamily: "Permanent Marker",
    fontSize: 80,
    rotation: -5,
    colorText: "#F5A623",
    colorGhostBlue: "#7B8DB5",
    colorGhostNavy: "#1B2A6B",
    duration: 8.5,
    sortOrder: 0,
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T12:00:00.000Z",
  };

  beforeEach(() => {
    (TitleRevealRepository as unknown as { instance: TitleRevealRepository | undefined }).instance = undefined;
    repository = TitleRevealRepository.getInstance();
    jest.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = TitleRevealRepository.getInstance();
      const instance2 = TitleRevealRepository.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should create a new instance if none exists", () => {
      (TitleRevealRepository as unknown as { instance: TitleRevealRepository | undefined }).instance = undefined;
      const instance = TitleRevealRepository.getInstance();
      expect(instance).toBeInstanceOf(TitleRevealRepository);
    });
  });

  describe("getAll", () => {
    it("should return transformed rows with JSON lines parsed and dates converted", () => {
      mockStmt.all.mockReturnValue([mockRawTitleReveal]);

      const results = repository.getAll();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM title_reveals ORDER BY sortOrder ASC, name ASC"
      );
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Episode Title");
      expect(results[0].lines).toEqual([
        { text: "Hello", fontSize: 80, alignment: "l", offsetX: 0, offsetY: 0 },
      ]);
      expect(results[0].createdAt).toBeInstanceOf(Date);
      expect(results[0].updatedAt).toBeInstanceOf(Date);
    });

    it("should return empty array when no title reveals exist", () => {
      mockStmt.all.mockReturnValue([]);
      const results = repository.getAll();
      expect(results).toEqual([]);
    });
  });

  describe("getById", () => {
    it("should return transformed entity when found", () => {
      mockStmt.get.mockReturnValue(mockRawTitleReveal);

      const result = repository.getById("tr-1");

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM title_reveals WHERE id = ?"
      );
      expect(mockStmt.get).toHaveBeenCalledWith("tr-1");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Episode Title");
      expect(result!.lines).toEqual([
        { text: "Hello", fontSize: 80, alignment: "l", offsetX: 0, offsetY: 0 },
      ]);
      expect(result!.createdAt).toBeInstanceOf(Date);
    });

    it("should return null for non-existent ID", () => {
      mockStmt.get.mockReturnValue(undefined);

      const result = repository.getById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should prepare correct INSERT SQL and pass all parameters", () => {
      const input: DbTitleRevealInput = {
        id: "new-tr",
        name: "New Title",
        lines: [{ text: "Line 1", fontSize: 80, alignment: "l", offsetX: 0, offsetY: 0 }],
        logoUrl: null,
        fontFamily: "Permanent Marker",
        fontSize: 80,
        rotation: -5,
        colorText: "#F5A623",
        colorGhostBlue: "#7B8DB5",
        colorGhostNavy: "#1B2A6B",
        duration: 8.5,
        sortOrder: 0,
      };

      repository.create(input);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO title_reveals"));
      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-tr",
        "New Title",
        JSON.stringify([{ text: "Line 1", fontSize: 80, alignment: "l", offsetX: 0, offsetY: 0 }]),
        null,
        "Permanent Marker",
        80,
        -5,
        "#F5A623",
        "#7B8DB5",
        "#1B2A6B",
        8.5,
        0,
        expect.any(String), // createdAt
        expect.any(String)  // updatedAt
      );
    });

    it("should serialize lines as JSON", () => {
      const lines = [
        { text: "Line 1", fontSize: 120, alignment: "c" as const, offsetX: 10, offsetY: -5 },
        { text: "Line 2", fontSize: 80, alignment: "l" as const, offsetX: 0, offsetY: 0 },
      ];
      const input: DbTitleRevealInput = {
        id: "tr-json",
        name: "JSON Test",
        lines,
        logoUrl: null,
        fontFamily: "Permanent Marker",
        fontSize: 80,
        rotation: -5,
        colorText: "#F5A623",
        colorGhostBlue: "#7B8DB5",
        colorGhostNavy: "#1B2A6B",
        duration: 8.5,
        sortOrder: 0,
      };

      repository.create(input);

      const calledArgs = mockStmt.run.mock.calls[0];
      expect(calledArgs[2]).toBe(JSON.stringify(lines));
    });
  });

  describe("update", () => {
    it("should fetch existing entity and merge updates", () => {
      mockStmt.get.mockReturnValue(mockRawTitleReveal);

      repository.update("tr-1", { name: "Updated Title" });

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE title_reveals"));
      expect(mockStmt.run).toHaveBeenCalledWith(
        "Updated Title",
        expect.any(String), // lines JSON
        null,               // logoUrl
        "Permanent Marker",
        80,
        -5,
        "#F5A623",
        "#7B8DB5",
        "#1B2A6B",
        8.5,
        0,
        expect.any(String), // updatedAt
        "tr-1"
      );
    });

    it("should throw error when title reveal not found", () => {
      mockStmt.get.mockReturnValue(undefined);

      expect(() => repository.update("non-existent", { name: "Updated" })).toThrow(
        "Title reveal with id non-existent not found"
      );
    });
  });

  describe("reorder", () => {
    it("should update sortOrder for each ID in order", () => {
      const ids = ["tr-3", "tr-1", "tr-2"];

      repository.reorder(ids);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "UPDATE title_reveals SET sortOrder = ?, updatedAt = ? WHERE id = ?"
      );
      expect(mockStmt.run).toHaveBeenCalledTimes(3);
      expect(mockStmt.run).toHaveBeenCalledWith(0, expect.any(String), "tr-3");
      expect(mockStmt.run).toHaveBeenCalledWith(1, expect.any(String), "tr-1");
      expect(mockStmt.run).toHaveBeenCalledWith(2, expect.any(String), "tr-2");
    });
  });

  describe("delete", () => {
    it("should prepare correct DELETE SQL with ID", () => {
      repository.delete("tr-1");

      expect(mockDb.prepare).toHaveBeenCalledWith("DELETE FROM title_reveals WHERE id = ?");
      expect(mockStmt.run).toHaveBeenCalledWith("tr-1");
    });

    it("should not throw when deleting non-existent title reveal", () => {
      expect(() => repository.delete("non-existent")).not.toThrow();
    });
  });
});
