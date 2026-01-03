import type { DbProfile, DbProfileInput, DbProfileUpdate } from "@/lib/models/Database";

// Mock safeJsonParse
jest.mock("@/lib/utils/safeJsonParse", () => ({
  safeJsonParse: jest.fn((json: string, fallback: unknown) => {
    if (json === null || json === undefined || json === "") {
      return fallback;
    }
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }),
}));

// Mock Logger
jest.mock("@/lib/utils/Logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock statement returned by prepare
const mockStmt = {
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};

// Mock database
const mockDb = {
  prepare: jest.fn(() => mockStmt),
};

// Mock DatabaseService
jest.mock("@/lib/services/DatabaseService", () => ({
  DatabaseService: {
    getInstance: jest.fn(() => ({
      getDb: jest.fn(() => mockDb),
    })),
  },
}));

// Import after mocking
import { ProfileRepository } from "@/lib/repositories/ProfileRepository";
import { safeJsonParse } from "@/lib/utils/safeJsonParse";

describe("ProfileRepository", () => {
  let repository: ProfileRepository;

  // Sample raw database row
  const mockDbRow = {
    id: "profile-1",
    name: "Test Profile",
    description: "A test profile",
    themeId: "theme-1",
    dskSourceName: "Habillage",
    defaultScene: "Main Scene",
    posterRotation: JSON.stringify([{ posterId: "poster-1", duration: 5000, order: 0 }]),
    audioSettings: JSON.stringify({ volume: 0.8 }),
    isActive: 1,
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T12:00:00.000Z",
  };

  const mockDbRow2 = {
    id: "profile-2",
    name: "Another Profile",
    description: null,
    themeId: "theme-2",
    dskSourceName: "Habillage",
    defaultScene: null,
    posterRotation: "[]",
    audioSettings: "{}",
    isActive: 0,
    createdAt: "2024-01-14T10:00:00.000Z",
    updatedAt: "2024-01-14T12:00:00.000Z",
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Reset singleton instance for isolation
    // @ts-expect-error - accessing private static property for testing
    ProfileRepository.instance = undefined;
    
    repository = ProfileRepository.getInstance();
  });

  describe("getInstance", () => {
    it("should return the same instance (singleton pattern)", () => {
      const instance1 = ProfileRepository.getInstance();
      const instance2 = ProfileRepository.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it("should create instance on first call", () => {
      // @ts-expect-error - accessing private static property for testing
      ProfileRepository.instance = undefined;
      
      const instance = ProfileRepository.getInstance();
      
      expect(instance).toBeInstanceOf(ProfileRepository);
    });
  });

  describe("getAll", () => {
    it("should return all profiles transformed and ordered", () => {
      mockStmt.all.mockReturnValue([mockDbRow, mockDbRow2]);

      const profiles = repository.getAll();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM profiles ORDER BY isActive DESC, name ASC"
      );
      expect(mockStmt.all).toHaveBeenCalled();
      expect(profiles).toHaveLength(2);
    });

    it("should transform database rows to DbProfile type", () => {
      mockStmt.all.mockReturnValue([mockDbRow]);

      const profiles = repository.getAll();

      expect(profiles[0]).toEqual({
        id: "profile-1",
        name: "Test Profile",
        description: "A test profile",
        themeId: "theme-1",
        dskSourceName: "Habillage",
        defaultScene: "Main Scene",
        posterRotation: [{ posterId: "poster-1", duration: 5000, order: 0 }],
        audioSettings: { volume: 0.8 },
        isActive: true,
        createdAt: new Date("2024-01-15T10:00:00.000Z"),
        updatedAt: new Date("2024-01-15T12:00:00.000Z"),
      });
    });

    it("should return empty array when no profiles exist", () => {
      mockStmt.all.mockReturnValue([]);

      const profiles = repository.getAll();

      expect(profiles).toEqual([]);
    });

    it("should use safeJsonParse for posterRotation and audioSettings", () => {
      mockStmt.all.mockReturnValue([mockDbRow]);

      repository.getAll();

      expect(safeJsonParse).toHaveBeenCalledWith(mockDbRow.posterRotation, []);
      expect(safeJsonParse).toHaveBeenCalledWith(mockDbRow.audioSettings, {});
    });
  });

  describe("getById", () => {
    it("should return transformed profile when found", () => {
      mockStmt.get.mockReturnValue(mockDbRow);

      const profile = repository.getById("profile-1");

      expect(mockDb.prepare).toHaveBeenCalledWith("SELECT * FROM profiles WHERE id = ?");
      expect(mockStmt.get).toHaveBeenCalledWith("profile-1");
      expect(profile).not.toBeNull();
      expect(profile?.id).toBe("profile-1");
      expect(profile?.isActive).toBe(true);
    });

    it("should return null when profile not found", () => {
      mockStmt.get.mockReturnValue(undefined);

      const profile = repository.getById("nonexistent");

      expect(profile).toBeNull();
    });

    it("should correctly parse JSON fields", () => {
      mockStmt.get.mockReturnValue(mockDbRow);

      const profile = repository.getById("profile-1");

      expect(profile?.posterRotation).toEqual([{ posterId: "poster-1", duration: 5000, order: 0 }]);
      expect(profile?.audioSettings).toEqual({ volume: 0.8 });
    });

    it("should convert isActive from number to boolean", () => {
      mockStmt.get.mockReturnValue({ ...mockDbRow, isActive: 0 });

      const profile = repository.getById("profile-1");

      expect(profile?.isActive).toBe(false);
    });

    it("should convert date strings to Date objects", () => {
      mockStmt.get.mockReturnValue(mockDbRow);

      const profile = repository.getById("profile-1");

      expect(profile?.createdAt).toBeInstanceOf(Date);
      expect(profile?.updatedAt).toBeInstanceOf(Date);
      expect(profile?.createdAt.toISOString()).toBe("2024-01-15T10:00:00.000Z");
    });
  });

  describe("getActive", () => {
    it("should return active profile when one exists", () => {
      mockStmt.get.mockReturnValue(mockDbRow);

      const profile = repository.getActive();

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "SELECT * FROM profiles WHERE isActive = 1 LIMIT 1"
      );
      expect(profile).not.toBeNull();
      expect(profile?.isActive).toBe(true);
    });

    it("should return null when no active profile exists", () => {
      mockStmt.get.mockReturnValue(undefined);

      const profile = repository.getActive();

      expect(profile).toBeNull();
    });
  });

  describe("create", () => {
    it("should insert profile with correct SQL and parameters", () => {
      const now = new Date("2024-01-20T10:00:00.000Z");
      const profileInput: DbProfileInput = {
        id: "new-profile",
        name: "New Profile",
        description: "Description",
        themeId: "theme-1",
        dskSourceName: "Custom DSK",
        defaultScene: "Scene 1",
        posterRotation: [{ posterId: "p1", duration: 3000, order: 0 }],
        audioSettings: { muted: false },
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      repository.create(profileInput);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO profiles"));
      expect(mockStmt.run).toHaveBeenCalledWith(
        "new-profile",
        "New Profile",
        "Description",
        "theme-1",
        "Custom DSK",
        "Scene 1",
        JSON.stringify([{ posterId: "p1", duration: 3000, order: 0 }]),
        JSON.stringify({ muted: false }),
        1,
        now.toISOString(),
        now.toISOString()
      );
    });

    it("should use default values for optional fields", () => {
      const profileInput: DbProfileInput = {
        id: "minimal-profile",
        name: "Minimal",
        description: null,
        themeId: "theme-1",
        dskSourceName: "",
        defaultScene: null,
        posterRotation: [],
        audioSettings: {},
        isActive: false,
      };

      repository.create(profileInput);

      expect(mockStmt.run).toHaveBeenCalledWith(
        "minimal-profile",
        "Minimal",
        null,
        "theme-1",
        "Habillage", // default value
        null,
        "[]",
        "{}",
        0,
        expect.any(String),
        expect.any(String)
      );
    });

    it("should JSON.stringify posterRotation array", () => {
      const profileInput: DbProfileInput = {
        id: "profile-json",
        name: "JSON Test",
        description: null,
        themeId: "theme-1",
        dskSourceName: "DSK",
        defaultScene: null,
        posterRotation: [
          { posterId: "p1", duration: 1000, order: 0 },
          { posterId: "p2", duration: 2000, order: 1 },
        ],
        audioSettings: { volume: 0.5, balance: 0 },
        isActive: false,
      };

      repository.create(profileInput);

      const runCall = mockStmt.run.mock.calls[0];
      expect(runCall[6]).toBe('[{"posterId":"p1","duration":1000,"order":0},{"posterId":"p2","duration":2000,"order":1}]');
      expect(runCall[7]).toBe('{"volume":0.5,"balance":0}');
    });

    it("should convert isActive boolean to number", () => {
      const profileInput: DbProfileInput = {
        id: "active-profile",
        name: "Active",
        description: null,
        themeId: "theme-1",
        dskSourceName: "DSK",
        defaultScene: null,
        posterRotation: [],
        audioSettings: {},
        isActive: true,
      };

      repository.create(profileInput);

      const runCall = mockStmt.run.mock.calls[0];
      expect(runCall[8]).toBe(1);
    });
  });

  describe("update", () => {
    it("should update profile with correct SQL and parameters", () => {
      const now = new Date("2024-01-20T15:00:00.000Z");
      const updates: DbProfileUpdate = {
        name: "Updated Name",
        description: "Updated description",
        themeId: "theme-2",
        dskSourceName: "Updated DSK",
        defaultScene: "New Scene",
        posterRotation: [{ posterId: "p3", duration: 4000, order: 0 }],
        audioSettings: { volume: 1.0 },
        isActive: false,
        updatedAt: now,
      };

      repository.update("profile-1", updates);

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE profiles"));
      expect(mockStmt.run).toHaveBeenCalledWith(
        "Updated Name",
        "Updated description",
        "theme-2",
        "Updated DSK",
        "New Scene",
        JSON.stringify([{ posterId: "p3", duration: 4000, order: 0 }]),
        JSON.stringify({ volume: 1.0 }),
        0,
        now.toISOString(),
        "profile-1"
      );
    });

    it("should use default dskSourceName when not provided", () => {
      const updates: DbProfileUpdate = {
        name: "Name",
        themeId: "theme-1",
        dskSourceName: "",
        posterRotation: [],
        audioSettings: {},
        isActive: true,
      };

      repository.update("profile-1", updates);

      const runCall = mockStmt.run.mock.calls[0];
      expect(runCall[3]).toBe("Habillage");
    });

    it("should use current date if updatedAt not provided", () => {
      const beforeCall = new Date();
      
      const updates: DbProfileUpdate = {
        name: "Name",
        themeId: "theme-1",
        posterRotation: [],
        audioSettings: {},
        isActive: true,
      };

      repository.update("profile-1", updates);

      const afterCall = new Date();
      const runCall = mockStmt.run.mock.calls[0];
      const updatedAt = new Date(runCall[8]);
      
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe("setActive", () => {
    it("should first deactivate all profiles", () => {
      repository.setActive("profile-2");

      // First prepare call should be deactivation
      expect(mockDb.prepare).toHaveBeenCalledWith("UPDATE profiles SET isActive = 0");
    });

    it("should then activate the specified profile", () => {
      repository.setActive("profile-2");

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "UPDATE profiles SET isActive = 1, updatedAt = ? WHERE id = ?"
      );
    });

    it("should call run with correct parameters for activation", () => {
      const beforeCall = new Date();
      
      repository.setActive("profile-2");

      const afterCall = new Date();
      
      // Second run call is for activation
      const runCalls = mockStmt.run.mock.calls;
      expect(runCalls.length).toBe(2);
      
      // First call is deactivation (no params)
      // Second call is activation with timestamp and id
      const activationCall = runCalls[1];
      const timestamp = new Date(activationCall[0]);
      
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      expect(activationCall[1]).toBe("profile-2");
    });

    it("should prepare two statements (deactivate all, activate one)", () => {
      repository.setActive("profile-1");

      expect(mockDb.prepare).toHaveBeenCalledTimes(2);
    });
  });

  describe("delete", () => {
    it("should delete profile with correct SQL", () => {
      repository.delete("profile-1");

      expect(mockDb.prepare).toHaveBeenCalledWith("DELETE FROM profiles WHERE id = ?");
      expect(mockStmt.run).toHaveBeenCalledWith("profile-1");
    });

    it("should pass the id to run", () => {
      repository.delete("profile-to-delete");

      expect(mockStmt.run).toHaveBeenCalledWith("profile-to-delete");
    });
  });

  describe("mapRowToProfile (via getById)", () => {
    it("should handle empty posterRotation JSON", () => {
      mockStmt.get.mockReturnValue({ ...mockDbRow, posterRotation: "[]" });

      const profile = repository.getById("profile-1");

      expect(profile?.posterRotation).toEqual([]);
    });

    it("should handle empty audioSettings JSON", () => {
      mockStmt.get.mockReturnValue({ ...mockDbRow, audioSettings: "{}" });

      const profile = repository.getById("profile-1");

      expect(profile?.audioSettings).toEqual({});
    });

    it("should handle malformed JSON with fallback", () => {
      // Mock safeJsonParse to return fallback for invalid JSON
      (safeJsonParse as jest.Mock).mockImplementation((json, fallback) => {
        if (json === "invalid-json") return fallback;
        try {
          return JSON.parse(json);
        } catch {
          return fallback;
        }
      });

      mockStmt.get.mockReturnValue({ 
        ...mockDbRow, 
        posterRotation: "invalid-json",
        audioSettings: "invalid-json" 
      });

      const profile = repository.getById("profile-1");

      expect(profile?.posterRotation).toEqual([]);
      expect(profile?.audioSettings).toEqual({});
    });

    it("should convert isActive = 0 to false", () => {
      mockStmt.get.mockReturnValue({ ...mockDbRow, isActive: 0 });

      const profile = repository.getById("profile-1");

      expect(profile?.isActive).toBe(false);
    });

    it("should convert isActive = 1 to true", () => {
      mockStmt.get.mockReturnValue({ ...mockDbRow, isActive: 1 });

      const profile = repository.getById("profile-1");

      expect(profile?.isActive).toBe(true);
    });

    it("should preserve all other fields unchanged", () => {
      mockStmt.get.mockReturnValue(mockDbRow);

      const profile = repository.getById("profile-1");

      expect(profile?.id).toBe("profile-1");
      expect(profile?.name).toBe("Test Profile");
      expect(profile?.description).toBe("A test profile");
      expect(profile?.themeId).toBe("theme-1");
      expect(profile?.dskSourceName).toBe("Habillage");
      expect(profile?.defaultScene).toBe("Main Scene");
    });
  });
});
