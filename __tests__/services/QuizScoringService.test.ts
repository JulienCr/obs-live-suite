import { QuizScoringService } from "../../lib/services/QuizScoringService";
import { Question } from "../../lib/models/Quiz";

describe("QuizScoringService", () => {
  let service: QuizScoringService;

  beforeEach(() => {
    service = new QuizScoringService(1);
  });

  describe("scoreQcm", () => {
    it("should return full points for correct answer", () => {
      expect(service.scoreQcm(true, 10)).toBe(10);
    });

    it("should return 0 for incorrect answer", () => {
      expect(service.scoreQcm(false, 10)).toBe(0);
    });
  });

  describe("scoreOpen", () => {
    it("should clamp assigned score to max points", () => {
      expect(service.scoreOpen(15, 10)).toBe(10);
    });

    it("should clamp negative scores to 0", () => {
      expect(service.scoreOpen(-5, 10)).toBe(0);
    });

    it("should return assigned score if within range", () => {
      expect(service.scoreOpen(7, 10)).toBe(7);
    });
  });

  describe("scoreClosest", () => {
    it("should return max points for exact match", () => {
      expect(service.scoreClosest(50, 50, 20)).toBe(20);
    });

    it("should deduct points based on distance", () => {
      const service2 = new QuizScoringService(2);
      expect(service2.scoreClosest(50, 45, 20)).toBe(10); // 20 - 2*5
    });

    it("should return 0 if score goes negative", () => {
      expect(service.scoreClosest(50, 0, 20)).toBe(0);
    });
  });

  describe("isQcmCorrect", () => {
    it("should return true for correct option index", () => {
      const question: Question = {
        id: "q1",
        type: "qcm",
        text: "Test",
        media: null,
        options: ["A", "B", "C", "D"],
        correct: 2,
        points: 10,
        tie_break: false,
        time_s: 20,
      };
      expect(service.isQcmCorrect(question, 2)).toBe(true);
    });

    it("should return false for incorrect option index", () => {
      const question: Question = {
        id: "q1",
        type: "qcm",
        text: "Test",
        media: null,
        options: ["A", "B", "C", "D"],
        correct: 2,
        points: 10,
        tie_break: false,
        time_s: 20,
      };
      expect(service.isQcmCorrect(question, 0)).toBe(false);
    });
  });

  describe("isClosestInRange", () => {
    it("should return true for value within range", () => {
      const question: Question = {
        id: "q1",
        type: "closest",
        text: "Test",
        media: null,
        correct: { min: 20, max: 30 },
        points: 10,
        tie_break: false,
        time_s: 20,
      };
      expect(service.isClosestInRange(question, 25)).toBe(true);
    });

    it("should return false for value outside range", () => {
      const question: Question = {
        id: "q1",
        type: "closest",
        text: "Test",
        media: null,
        correct: { min: 20, max: 30 },
        points: 10,
        tie_break: false,
        time_s: 20,
      };
      expect(service.isClosestInRange(question, 35)).toBe(false);
    });

    it("should return true if no range specified", () => {
      const question: Question = {
        id: "q1",
        type: "closest",
        text: "Test",
        media: null,
        correct: 50,
        points: 10,
        tie_break: false,
        time_s: 20,
      };
      expect(service.isClosestInRange(question, 100)).toBe(true);
    });
  });
});

