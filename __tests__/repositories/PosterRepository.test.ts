import { PosterRepository } from "../../lib/repositories/PosterRepository";
import type { DbPoster, DbPosterInput, DbPosterUpdate } from "../../lib/models/Database";

// Mock safeJsonParse utilities
jest.mock("@/lib/utils/safeJsonParse", () => ({
  safeJsonParse: jest.fn(<T>(json: string | null | undefined, fallback: T): T => {
    if (json === null || json === undefined || json === "") {
      return fallback;
    }
    try {
      return JSON.parse(json) as T;
    } catch {
      return fallback;
    }
  }),
  safeJsonParseOptional: jest.fn(<T>(json: string | null | undefined): T | undefined => {
    if (json === null || json === undefined || json === "") {
      return undefined;
    }
    try {
      return JSON.parse(json) as T;
    } catch {
      return undefined;
    }
  }),
}));

// Mock Logger
jest.mock("@/lib/utils/Logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Create mock statement and db objects
const mockStmt = {
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};

const mockDb = {
  prepare: jest.fn(() => mockStmt),
};

const mockDbService = {
  getDb: jest.fn(() => mockDb),
};

// Mock DatabaseService
jest.mock("@/lib/services/DatabaseService", () => ({
  DatabaseService: {
    getInstance: jest.fn(() => mockDbService),
  },
}));

describe("PosterRepository", () => {
  let repository: PosterRepository;

  // Sample raw database row (as stored in SQLite)
  const sampleDbRow = {
    id: "poster-1",
    title: "Test Poster",
    description: "A test description",
    source: "test-source",
    fileUrl: "/uploads/poster.jpg",
    type: "image",
    duration: 30,
    tags: '["tag1", "tag2"]',
    profileIds: '["profile-1", "profile-2"]',
    metadata: '{"key": "value"}',
    chatMessage: "Check out this poster!",
    isEnabled: 1,
    parentPosterId: null,
    startTime: null,
    endTime: null,
    thumbnailUrl: null,
    endBehavior: null,
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T12:00:00.000Z",
  };

  // Expected transformed poster
  const expectedPoster: DbPoster = {
    id: "poster-1",
    title: "Test Poster",
    description: "A test description",
    source: "test-source",
    fileUrl: "/uploads/poster.jpg",
    type: "image",
    duration: 30,
    tags: ["tag1", "tag2"],
    profileIds: ["profile-1", "profile-2"],
    metadata: { key: "value" },
    chatMessage: "Check out this poster!",
    isEnabled: true,
    parentPosterId: null,
    startTime: null,
    endTime: null,
    thumbnailUrl: null,
    endBehavior: null,
    createdAt: new Date("2024-01-15T10:00:00.000Z"),
    updatedAt: new Date("2024-01-15T12:00:00.000Z"),
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockStmt.all.mockReset();
    mockStmt.get.mockReset();
    mockStmt.run.mockReset();
    mockDb.prepare.mockClear();
    mockDb.prepare.mockReturnValue(mockStmt);

    // Reset singleton for clean tests
    // @ts-expect-error - accessing private static for testing
    PosterRepository.instance = undefined;
    repository = PosterRepository.getInstance();
  });

  describe("getInstance", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = PosterRepository.getInstance();
      const instance2 = PosterRepository.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create a new instance if none exists", () => {
      // @ts-expect-error - accessing private static for testing
      PosterRepository.instance = undefined;

      const instance = PosterRepository.getInstance();

      expect(instance).toBeInstanceOf(PosterRepository);
    });
  });

  describe("getAll", () => {
    it("should return all posters with transformed fields", () => {
      mockStmt.all.mockReturnValue([sampleDbRow]);

      const result = repository.getAll();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM posters ORDER BY createdAt DESC"
      );
      expect(mockStmt.all).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedPoster);
    });

    it("should return empty array when no posters exist", () => {
      mockStmt.all.mockReturnValue([]);

      const result = repository.getAll();

      expect(result).toEqual([]);
    });

    it("should correctly parse JSON fields (tags, profileIds, metadata)", () => {
      mockStmt.all.mockReturnValue([sampleDbRow]);

      const result = repository.getAll();

      expect(result[0].tags).toEqual(["tag1", "tag2"]);
      expect(result[0].profileIds).toEqual(["profile-1", "profile-2"]);
      expect(result[0].metadata).toEqual({ key: "value" });
    });

    it("should convert isEnabled from number to boolean", () => {
      mockStmt.all.mockReturnValue([
        { ...sampleDbRow, isEnabled: 1 },
        { ...sampleDbRow, id: "poster-2", isEnabled: 0 },
      ]);

      const result = repository.getAll();

      expect(result[0].isEnabled).toBe(true);
      expect(result[1].isEnabled).toBe(false);
    });

    it("should convert date strings to Date objects", () => {
      mockStmt.all.mockReturnValue([sampleDbRow]);

      const result = repository.getAll();

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });

    it("should handle null metadata", () => {
      const rowWithNullMetadata = { ...sampleDbRow, metadata: null };
      mockStmt.all.mockReturnValue([rowWithNullMetadata]);

      const result = repository.getAll();

      expect(result[0].metadata).toBeUndefined();
    });
  });

  describe("getById", () => {
    it("should return a transformed poster when found", () => {
      mockStmt.get.mockReturnValue(sampleDbRow);

      const result = repository.getById("poster-1");

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM posters WHERE id = ?"
      );
      expect(mockStmt.get).toHaveBeenCalledWith("poster-1");
      expect(result).toEqual(expectedPoster);
    });

    it("should return null when poster not found", () => {
      mockStmt.get.mockReturnValue(undefined);

      const result = repository.getById("nonexistent");

      expect(mockStmt.get).toHaveBeenCalledWith("nonexistent");
      expect(result).toBeNull();
    });

    it("should correctly transform all fields", () => {
      mockStmt.get.mockReturnValue(sampleDbRow);

      const result = repository.getById("poster-1");

      expect(result).not.toBeNull();
      expect(result!.tags).toEqual(["tag1", "tag2"]);
      expect(result!.profileIds).toEqual(["profile-1", "profile-2"]);
      expect(result!.isEnabled).toBe(true);
      expect(result!.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("create", () => {
    it("should insert a poster with correct SQL and parameters", () => {
      const posterInput: DbPosterInput = {
        id: "new-poster",
        title: "New Poster",
        description: "Description",
        source: "source",
        fileUrl: "/uploads/new.jpg",
        type: "image",
        duration: 45,
        tags: ["new", "poster"],
        profileIds: ["profile-1"],
        metadata: { custom: "data" },
        chatMessage: "New poster message",
        isEnabled: true,
      };

      repository.create(posterInput);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO posters"));
      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-poster",
        "New Poster",
        "Description",
        "source",
        "/uploads/new.jpg",
        "image",
        45,
        '["new","poster"]',
        '["profile-1"]',
        '{"custom":"data"}',
        "New poster message",
        1,
        null, // parentPosterId
        null, // startTime
        null, // endTime
        null, // thumbnailUrl
        null, // endBehavior
        expect.any(String), // createdAt ISO string
        expect.any(String)  // updatedAt ISO string
      );
    });

    it("should use default empty arrays for tags and profileIds", () => {
      const posterInput: DbPosterInput = {
        id: "minimal-poster",
        title: "Minimal",
        description: null,
        source: null,
        fileUrl: "/uploads/min.jpg",
        type: "video",
        duration: null,
        tags: [],
        profileIds: [],
        chatMessage: null,
        isEnabled: false,
      };

      repository.create(posterInput);

      expect(mockStmt.run).toHaveBeenCalledWith(
        "minimal-poster",
        "Minimal",
        null,
        null,
        "/uploads/min.jpg",
        "video",
        null,
        "[]",
        "[]",
        null,
        null,
        0,
        null, // parentPosterId
        null, // startTime
        null, // endTime
        null, // thumbnailUrl
        null, // endBehavior
        expect.any(String),
        expect.any(String)
      );
    });

    it("should use provided createdAt and updatedAt dates", () => {
      const specificDate = new Date("2024-06-01T00:00:00.000Z");
      const posterInput: DbPosterInput = {
        id: "dated-poster",
        title: "Dated",
        description: null,
        source: null,
        fileUrl: "/uploads/dated.jpg",
        type: "image",
        duration: null,
        tags: [],
        profileIds: [],
        chatMessage: null,
        isEnabled: true,
        createdAt: specificDate,
        updatedAt: specificDate,
      };

      repository.create(posterInput);

      // Verify the date strings are passed correctly (positions 17 and 18 with new sub-video fields)
      const runArgs = mockStmt.run.mock.calls[0];
      expect(runArgs[17]).toBe("2024-06-01T00:00:00.000Z"); // createdAt
      expect(runArgs[18]).toBe("2024-06-01T00:00:00.000Z"); // updatedAt
    });

    it("should convert isEnabled boolean to integer", () => {
      const enabledPoster: DbPosterInput = {
        id: "enabled",
        title: "Enabled",
        fileUrl: "/e.jpg",
        type: "image",
        tags: [],
        profileIds: [],
        isEnabled: true,
        description: null,
        source: null,
        duration: null,
        chatMessage: null,
      };

      const disabledPoster: DbPosterInput = {
        id: "disabled",
        title: "Disabled",
        fileUrl: "/d.jpg",
        type: "image",
        tags: [],
        profileIds: [],
        isEnabled: false,
        description: null,
        source: null,
        duration: null,
        chatMessage: null,
      };

      repository.create(enabledPoster);
      // isEnabled is at position 11 (0-indexed, after chatMessage)
      let runArgs = mockStmt.run.mock.calls[0];
      expect(runArgs[11]).toBe(1); // isEnabled = true -> 1

      repository.create(disabledPoster);
      runArgs = mockStmt.run.mock.calls[1];
      expect(runArgs[11]).toBe(0); // isEnabled = false -> 0
    });
  });

  describe("update", () => {
    it("should update a poster with merged data", () => {
      mockStmt.get.mockReturnValue(sampleDbRow);

      const updates: DbPosterUpdate = {
        title: "Updated Title",
        description: "Updated description",
      };

      repository.update("poster-1", updates);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE posters"));
      expect(mockStmt.run).toHaveBeenCalledWith(
        "Updated Title",
        "Updated description",
        "test-source", // kept from existing
        "/uploads/poster.jpg", // kept from existing
        "image", // kept from existing
        30, // kept from existing
        '["tag1","tag2"]', // kept from existing
        '["profile-1","profile-2"]', // kept from existing
        '{"key":"value"}', // kept from existing
        "Check out this poster!", // kept from existing
        1, // kept from existing
        null, // parentPosterId
        null, // startTime
        null, // endTime
        null, // thumbnailUrl
        null, // endBehavior
        expect.any(String), // updatedAt
        "poster-1"
      );
    });

    it("should throw error when poster not found", () => {
      mockStmt.get.mockReturnValue(undefined);

      expect(() => {
        repository.update("nonexistent", { title: "Updated" });
      }).toThrow("Poster with id nonexistent not found");
    });

    it("should update only specified fields and keep others", () => {
      mockStmt.get.mockReturnValue(sampleDbRow);

      const updates: DbPosterUpdate = {
        isEnabled: false,
        tags: ["updated", "tags"],
      };

      repository.update("poster-1", updates);

      expect(mockStmt.run).toHaveBeenCalledWith(
        "Test Poster", // kept
        "A test description", // kept
        "test-source", // kept
        "/uploads/poster.jpg", // kept
        "image", // kept
        30, // kept
        '["updated","tags"]', // updated
        '["profile-1","profile-2"]', // kept
        '{"key":"value"}', // kept
        "Check out this poster!", // kept
        0, // updated to false
        null, // parentPosterId
        null, // startTime
        null, // endTime
        null, // thumbnailUrl
        null, // endBehavior
        expect.any(String),
        "poster-1"
      );
    });

    it("should handle null metadata correctly", () => {
      mockStmt.get.mockReturnValue(sampleDbRow);

      const updates: DbPosterUpdate = {
        metadata: undefined, // keep existing
      };

      repository.update("poster-1", updates);

      // Should keep existing metadata (at position 8)
      const runArgs = mockStmt.run.mock.calls[0];
      expect(runArgs[8]).toBe('{"key":"value"}'); // metadata preserved
    });

    it("should use provided updatedAt date", () => {
      mockStmt.get.mockReturnValue(sampleDbRow);
      const specificDate = new Date("2024-12-25T00:00:00.000Z");

      const updates: DbPosterUpdate = {
        title: "Holiday Update",
        updatedAt: specificDate,
      };

      repository.update("poster-1", updates);

      // updatedAt is at position 16 (second to last before id)
      const runArgs = mockStmt.run.mock.calls[0];
      expect(runArgs[0]).toBe("Holiday Update");
      expect(runArgs[16]).toBe("2024-12-25T00:00:00.000Z");
      expect(runArgs[17]).toBe("poster-1");
    });

    it("should handle clearing optional fields with null", () => {
      mockStmt.get.mockReturnValue(sampleDbRow);

      const updates: DbPosterUpdate = {
        description: null,
        source: null,
        chatMessage: null,
      };

      repository.update("poster-1", updates);

      const runArgs = mockStmt.run.mock.calls[0];
      expect(runArgs[0]).toBe("Test Poster");
      expect(runArgs[1]).toBe(null); // description cleared
      expect(runArgs[2]).toBe(null); // source cleared
      expect(runArgs[3]).toBe("/uploads/poster.jpg");
      expect(runArgs[4]).toBe("image");
      expect(runArgs[5]).toBe(30);
      expect(runArgs[9]).toBe(null); // chatMessage cleared
      expect(runArgs[10]).toBe(1); // isEnabled
      expect(runArgs[17]).toBe("poster-1"); // id at end
    });
  });

  describe("delete", () => {
    it("should delete a poster by id", () => {
      repository.delete("poster-1");

      expect(mockDb.prepare).toHaveBeenCalledWith("DELETE FROM posters WHERE id = ?");
      expect(mockStmt.run).toHaveBeenCalledWith("poster-1");
    });

    it("should call run even if poster does not exist", () => {
      repository.delete("nonexistent");

      expect(mockStmt.run).toHaveBeenCalledWith("nonexistent");
    });
  });

  describe("transformRow (via getAll/getById)", () => {
    it("should handle empty tags array", () => {
      const rowWithEmptyTags = { ...sampleDbRow, tags: "[]" };
      mockStmt.get.mockReturnValue(rowWithEmptyTags);

      const result = repository.getById("poster-1");

      expect(result!.tags).toEqual([]);
    });

    it("should handle empty profileIds array", () => {
      const rowWithEmptyProfileIds = { ...sampleDbRow, profileIds: "[]" };
      mockStmt.get.mockReturnValue(rowWithEmptyProfileIds);

      const result = repository.getById("poster-1");

      expect(result!.profileIds).toEqual([]);
    });

    it("should handle isEnabled = 0 as false", () => {
      const disabledRow = { ...sampleDbRow, isEnabled: 0 };
      mockStmt.get.mockReturnValue(disabledRow);

      const result = repository.getById("poster-1");

      expect(result!.isEnabled).toBe(false);
    });

    it("should correctly parse complex metadata", () => {
      const complexMetadata = {
        nested: { key: "value" },
        array: [1, 2, 3],
        boolean: true,
      };
      const rowWithComplexMetadata = {
        ...sampleDbRow,
        metadata: JSON.stringify(complexMetadata),
      };
      mockStmt.get.mockReturnValue(rowWithComplexMetadata);

      const result = repository.getById("poster-1");

      expect(result!.metadata).toEqual(complexMetadata);
    });
  });
});
