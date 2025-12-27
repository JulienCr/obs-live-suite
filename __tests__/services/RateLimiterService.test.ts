import { RateLimiterService, RateLimitPresets } from "@/lib/services/RateLimiterService";

describe("RateLimiterService", () => {
  let rateLimiter: RateLimiterService;

  beforeEach(() => {
    rateLimiter = RateLimiterService.getInstance();
    // Clear any existing state
    rateLimiter.reset("test-key");
  });

  describe("checkLimit", () => {
    it("should allow requests within limit", () => {
      const result1 = rateLimiter.checkLimit("test-key", 5, 60);
      const result2 = rateLimiter.checkLimit("test-key", 5, 60);
      const result3 = rateLimiter.checkLimit("test-key", 5, 60);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it("should block requests exceeding limit", () => {
      const limit = 3;

      // Use up all tokens
      for (let i = 0; i < limit; i++) {
        expect(rateLimiter.checkLimit("test-key", limit, 60)).toBe(true);
      }

      // Next request should be blocked
      expect(rateLimiter.checkLimit("test-key", limit, 60)).toBe(false);
    });

    it("should track different keys independently", () => {
      expect(rateLimiter.checkLimit("key1", 1, 60)).toBe(true);
      expect(rateLimiter.checkLimit("key2", 1, 60)).toBe(true);

      // Both keys should be exhausted independently
      expect(rateLimiter.checkLimit("key1", 1, 60)).toBe(false);
      expect(rateLimiter.checkLimit("key2", 1, 60)).toBe(false);
    });

    it("should refill tokens over time", async () => {
      // Exhaust limit
      rateLimiter.checkLimit("test-key", 1, 1); // 1 request per second

      // Should be blocked immediately
      expect(rateLimiter.checkLimit("test-key", 1, 1)).toBe(false);

      // Wait for refill (1 second)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be allowed again
      expect(rateLimiter.checkLimit("test-key", 1, 1)).toBe(true);
    }, 2000);
  });

  describe("getRemaining", () => {
    it("should return full limit for new key", () => {
      const remaining = rateLimiter.getRemaining("new-key", 10);
      expect(remaining).toBe(10);
    });

    it("should return remaining tokens after usage", () => {
      const limit = 5;
      rateLimiter.checkLimit("test-key", limit, 60);
      rateLimiter.checkLimit("test-key", limit, 60);

      const remaining = rateLimiter.getRemaining("test-key", limit);
      expect(remaining).toBe(3);
    });
  });

  describe("reset", () => {
    it("should reset rate limit for a key", () => {
      // Exhaust limit
      rateLimiter.checkLimit("test-key", 1, 60);
      expect(rateLimiter.checkLimit("test-key", 1, 60)).toBe(false);

      // Reset
      rateLimiter.reset("test-key");

      // Should be allowed again
      expect(rateLimiter.checkLimit("test-key", 1, 60)).toBe(true);
    });
  });

  describe("RateLimitPresets", () => {
    it("should have correct Wikipedia preset", () => {
      expect(RateLimitPresets.WIKIPEDIA.limit).toBe(10);
      expect(RateLimitPresets.WIKIPEDIA.window).toBe(60);
    });

    it("should have correct Ollama preset", () => {
      expect(RateLimitPresets.OLLAMA.limit).toBe(5);
      expect(RateLimitPresets.OLLAMA.window).toBe(60);
    });

    it("should have correct General preset", () => {
      expect(RateLimitPresets.GENERAL.limit).toBe(30);
      expect(RateLimitPresets.GENERAL.window).toBe(60);
    });
  });

  describe("getTrackedCount", () => {
    it("should return number of tracked keys", () => {
      expect(rateLimiter.getTrackedCount()).toBeGreaterThanOrEqual(0);

      rateLimiter.checkLimit("key1", 5, 60);
      rateLimiter.checkLimit("key2", 5, 60);

      expect(rateLimiter.getTrackedCount()).toBeGreaterThanOrEqual(2);
    });
  });
});


