import { QuizBuzzerService } from "../../lib/services/QuizBuzzerService";

describe("QuizBuzzerService", () => {
  let service: QuizBuzzerService;

  beforeEach(() => {
    service = new QuizBuzzerService({
      lockMs: 100,
      steal: false,
      stealWindowMs: 2000,
    });
  });

  describe("hit", () => {
    it("should accept first buzz", () => {
      const result = service.hit("player1");
      expect(result.accepted).toBe(true);
      expect(result.winner).toBe("player1");
    });

    it("should reject second buzz when steal is disabled", () => {
      service.hit("player1");
      const result = service.hit("player2");
      expect(result.accepted).toBe(false);
      expect(result.winner).toBe("player1");
    });

    it("should reject buzz within debounce window", () => {
      const now = Date.now();
      service.hit("player1", now);
      const result = service.hit("player2", now + 50); // Within 100ms lockMs
      expect(result.accepted).toBe(false);
    });

    it("should allow steal when enabled within window", () => {
      const serviceWithSteal = new QuizBuzzerService({
        lockMs: 100,
        steal: true,
        stealWindowMs: 2000,
      });
      const now = Date.now();
      serviceWithSteal.hit("player1", now);
      const result = serviceWithSteal.hit("player2", now + 500);
      expect(result.accepted).toBe(true);
      expect(result.winner).toBe("player2");
    });

    it("should reject steal outside window", () => {
      const serviceWithSteal = new QuizBuzzerService({
        lockMs: 100,
        steal: true,
        stealWindowMs: 1000,
      });
      const now = Date.now();
      serviceWithSteal.hit("player1", now);
      const result = serviceWithSteal.hit("player2", now + 1500);
      expect(result.accepted).toBe(false);
    });
  });

  describe("reset", () => {
    it("should clear winner and allow new buzz", () => {
      service.hit("player1");
      service.reset();
      const result = service.hit("player2");
      expect(result.accepted).toBe(true);
      expect(result.winner).toBe("player2");
    });
  });

  describe("forceLock", () => {
    it("should prevent further buzzes", () => {
      service.forceLock();
      const result = service.hit("player1");
      expect(result.accepted).toBe(false);
    });
  });

  describe("getWinner", () => {
    it("should return null when no winner", () => {
      expect(service.getWinner()).toBeNull();
    });

    it("should return winner id after buzz", () => {
      service.hit("player1");
      expect(service.getWinner()).toBe("player1");
    });
  });
});

