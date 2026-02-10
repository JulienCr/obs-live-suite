import { TextPresetRepository } from "@/lib/repositories/TextPresetRepository";

/**
 * Unit tests for TextPresetRepository
 *
 * Note: These tests are structural. The repository relies on SQLite via
 * DatabaseConnector.getInstance().getDb(), which requires full database
 * initialization. We test the singleton pattern and verify the class
 * exposes the expected API surface.
 */
describe("TextPresetRepository", () => {
  describe("Singleton Pattern", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = TextPresetRepository.getInstance();
      const instance2 = TextPresetRepository.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should be an instance of TextPresetRepository", () => {
      const instance = TextPresetRepository.getInstance();
      expect(instance).toBeInstanceOf(TextPresetRepository);
    });
  });

  describe("API Surface", () => {
    let repo: TextPresetRepository;

    beforeEach(() => {
      repo = TextPresetRepository.getInstance();
    });

    it("should have a create method", () => {
      expect(typeof repo.create).toBe("function");
    });

    it("should have an update method", () => {
      expect(typeof repo.update).toBe("function");
    });

    it("should have a getAll method", () => {
      expect(typeof repo.getAll).toBe("function");
    });

    it("should have a getById method", () => {
      expect(typeof repo.getById).toBe("function");
    });

    it("should have a delete method", () => {
      expect(typeof repo.delete).toBe("function");
    });

    it("should have an exists method", () => {
      expect(typeof repo.exists).toBe("function");
    });

    it("should have a count method", () => {
      expect(typeof repo.count).toBe("function");
    });
  });
});
