import { QuizViewerInputService } from "../../lib/services/QuizViewerInputService";

describe("QuizViewerInputService", () => {
  let service: QuizViewerInputService;

  beforeEach(() => {
    service = new QuizViewerInputService({
      perUserCooldownMs: 1000,
      perUserMaxAttempts: 3,
      globalRps: 10,
      firstOrLastWins: "last",
    });
  });

  describe("tryRecord", () => {
    it("should accept first attempt", () => {
      expect(service.tryRecord("user1", "A")).toBe(true);
    });

    it("should respect max attempts", () => {
      service.tryRecord("user1", "A");
      service.tryRecord("user1", "B");
      service.tryRecord("user1", "C");
      expect(service.tryRecord("user1", "D")).toBe(false);
    });

    it("should track last value when firstOrLastWins is last", () => {
      const now = Date.now();
      service.tryRecord("user1", "A");
      // Wait for cooldown to pass
      const serviceNoCooldown = new QuizViewerInputService({
        perUserCooldownMs: 0,
        perUserMaxAttempts: 5,
        globalRps: 100,
        firstOrLastWins: "last",
      });
      serviceNoCooldown.tryRecord("user1", "A");
      serviceNoCooldown.tryRecord("user1", "B");
      expect(serviceNoCooldown.getValue("user1")).toBe("B");
    });

    it("should keep first value when firstOrLastWins is first", () => {
      const serviceFirst = new QuizViewerInputService({
        perUserCooldownMs: 0,
        perUserMaxAttempts: 5,
        globalRps: 100,
        firstOrLastWins: "first",
      });
      serviceFirst.tryRecord("user1", "A");
      serviceFirst.tryRecord("user1", "B");
      expect(serviceFirst.getValue("user1")).toBe("A");
    });
  });

  describe("getQcmCounts", () => {
    it("should return correct counts for QCM options", () => {
      service.tryRecord("user1", "A");
      service.tryRecord("user2", "B");
      service.tryRecord("user3", "A");
      const counts = service.getQcmCounts();
      expect(counts.A).toBe(2);
      expect(counts.B).toBe(1);
      expect(counts.C).toBe(0);
      expect(counts.D).toBe(0);
    });
  });

  describe("getQcmPercentages", () => {
    it("should return correct percentages", () => {
      service.tryRecord("user1", "A");
      service.tryRecord("user2", "A");
      service.tryRecord("user3", "B");
      service.tryRecord("user4", "B");
      const pct = service.getQcmPercentages();
      expect(pct.A).toBe(50);
      expect(pct.B).toBe(50);
    });
  });

  describe("getAllClosestValues", () => {
    it("should return all numeric values", () => {
      service.tryRecord("user1", 42);
      service.tryRecord("user2", 50);
      service.tryRecord("user3", 38);
      const values = service.getAllClosestValues();
      expect(values).toContain(42);
      expect(values).toContain(50);
      expect(values).toContain(38);
      expect(values.length).toBe(3);
    });

    it("should filter out non-numeric values", () => {
      service.tryRecord("user1", 42);
      service.tryRecord("user2", "not a number");
      const values = service.getAllClosestValues();
      expect(values).toEqual([42]);
    });
  });

  describe("reset", () => {
    it("should clear all user data", () => {
      service.tryRecord("user1", "A");
      service.reset();
      expect(service.getValue("user1")).toBeUndefined();
    });
  });
});

