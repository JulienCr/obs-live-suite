/**
 * Integration test for Wikipedia Summarization API
 * Tests the full flow from API request to cached response
 *
 * NOTE: These tests are skipped by default because they require:
 * 1. The Next.js development server running on localhost:3000
 * 2. Some tests also require Ollama running locally for LLM summarization
 *
 * To run these tests manually:
 * 1. Start the dev server: pnpm dev
 * 2. Run the tests: pnpm test __tests__/integration/wikipedia-summarize-api.test.ts
 */

describe.skip("Wikipedia Summarize API", () => {
  const API_URL = "http://localhost:3000/api/wikipedia/summarize";

  describe("POST /api/wikipedia/summarize", () => {
    it("should return 400 for invalid request body", async () => {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_INPUT");
    });

    it("should return 400 for query too short", async () => {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "a" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it("should return 404 for non-existent Wikipedia page", async () => {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "xyznonexistentpage123456" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("NOT_FOUND");
    });

    // Note: These tests require Ollama running locally
    it.skip("should successfully summarize Wikipedia page", async () => {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "lion" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.query).toBe("lion");
      expect(data.data.title).toBeTruthy();
      expect(data.data.summary).toBeInstanceOf(Array);
      expect(data.data.summary.length).toBeGreaterThanOrEqual(1);
      expect(data.data.summary.length).toBeLessThanOrEqual(5);
      expect(data.data.source).toMatch(/direct|wikidata/);
      expect(data.data.cached).toBe(false);
    }, 30000);

    it.skip("should return cached result on second request", async () => {
      // First request
      const response1 = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "paris" }),
      });

      const data1 = await response1.json();
      expect(data1.data.cached).toBe(false);

      // Second request (should be cached)
      const response2 = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "paris" }),
      });

      const data2 = await response2.json();
      expect(data2.success).toBe(true);
      expect(data2.data.cached).toBe(true);
      expect(data2.data.source).toBe("cache");
    }, 30000);

    it.skip("should bypass cache with forceRefresh", async () => {
      // First request to populate cache
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "tokyo" }),
      });

      // Second request with forceRefresh
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "tokyo", forceRefresh: true }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.cached).toBe(false);
    }, 30000);

    it.skip("should handle Wikidata fallback for relational queries", async () => {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "capitale du Kenya" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.title.toLowerCase()).toContain("nairobi");
      expect(data.data.source).toBe("wikidata");
    }, 30000);

    it("should enforce rate limiting", async () => {
      const requests = [];
      
      // Make 15 requests rapidly (limit is 10 per minute)
      for (let i = 0; i < 15; i++) {
        requests.push(
          fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: `test${i}` }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);

      // At least some requests should be rate limited
      expect(statuses).toContain(429);
    }, 10000);
  });
});



