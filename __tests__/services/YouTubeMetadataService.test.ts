import { YouTubeMetadataService } from "@/lib/services/YouTubeMetadataService";

/**
 * Unit tests for YouTubeMetadataService
 * 
 * Note: These tests do not call the actual YouTube API.
 * They only test the service structure and error handling.
 */
describe("YouTubeMetadataService", () => {
  let service: YouTubeMetadataService;

  beforeEach(() => {
    service = YouTubeMetadataService.getInstance();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = YouTubeMetadataService.getInstance();
      const instance2 = YouTubeMetadataService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("Configuration", () => {
    it("should have isConfigured method", () => {
      expect(typeof service.isConfigured).toBe("function");
    });
  });

  describe("Input Validation", () => {
    it("should return null for empty video ID", async () => {
      const result = await service.fetchMetadata("");
      expect(result).toBeNull();
    });

    it("should return null for whitespace-only video ID", async () => {
      const result = await service.fetchMetadata("   ");
      expect(result).toBeNull();
    });
  });

  describe("API Response Structure", () => {
    it("should return null if API key is not configured", async () => {
      // Without YOUTUBE_API_KEY in environment, should return null
      const result = await service.fetchMetadata("dQw4w9WgXcQ");
      
      if (!service.isConfigured()) {
        expect(result).toBeNull();
      }
    });
  });
});
