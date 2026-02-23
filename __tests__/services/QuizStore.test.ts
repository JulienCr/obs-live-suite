import { QuizStore } from "@/lib/services/QuizStore";
import { PathManager } from "@/lib/config/PathManager";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";

// Mock Logger
const mockError = jest.fn();
const mockWarn = jest.fn();
const mockInfo = jest.fn();
jest.mock("@/lib/utils/Logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
  })),
}));

// Mock PathManager
const mockGetQuizDir = jest.fn().mockReturnValue("/mock/quiz");
const mockGetQuizSessionsDir = jest.fn().mockReturnValue("/mock/quiz/sessions");
jest.mock("@/lib/config/PathManager", () => ({
  PathManager: {
    getInstance: jest.fn(() => ({
      getQuizDir: mockGetQuizDir,
      getQuizSessionsDir: mockGetQuizSessionsDir,
    })),
  },
}));

// Mock GuestRepository for ensurePlayersFromGuests
jest.mock("@/lib/repositories/GuestRepository", () => ({
  GuestRepository: {
    getInstance: jest.fn(() => ({
      getAll: jest.fn().mockReturnValue([]),
    })),
  },
}));

// Mock fs
jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

// Mock fs/promises
jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

describe("QuizStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance for fresh tests
    // @ts-expect-error - accessing private static property for testing
    QuizStore.instance = undefined;
  });

  describe("loadQuestionBank", () => {
    it("should handle malformed JSON gracefully without throwing", async () => {
      // Arrange: File exists but contains corrupted JSON
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockResolvedValue('{"questions": []}{ "extra": "garbage" }');

      // Act: Create instance which triggers loadQuestionBank
      const store = QuizStore.getInstance();

      // Wait for async loadQuestionBank to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert: Should not throw and should log error with file path
      expect(mockError).toHaveBeenCalled();
      const errorCall = mockError.mock.calls[0];
      expect(errorCall[0]).toContain("questions.json");
      // Path separator varies by platform (/ on Unix, \ on Windows)
      expect(errorCall[0]).toMatch(/mock[/\\]quiz/);
    });

    it("should initialize with empty question bank when JSON is malformed", async () => {
      // Arrange: File exists but contains corrupted JSON
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockResolvedValue('{"questions": invalid json');

      // Act
      const store = QuizStore.getInstance();

      // Wait for async loadQuestionBank to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert: Should have empty question bank
      const questions = store.getAllQuestions();
      expect(questions).toEqual([]);
    });

    it("should log SyntaxError details when JSON parsing fails", async () => {
      // Arrange: File exists but contains corrupted JSON
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockResolvedValue('not valid json at all');

      // Act
      const store = QuizStore.getInstance();

      // Wait for async loadQuestionBank to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert: Error log should mention SyntaxError or JSON parsing
      expect(mockError).toHaveBeenCalled();
      const errorCall = mockError.mock.calls[0];
      expect(errorCall[0].toLowerCase()).toMatch(/json|syntax|parse|malformed/i);
    });

    it("should load questions successfully when JSON is valid", async () => {
      // Arrange: File exists with valid JSON
      (existsSync as jest.Mock).mockReturnValue(true);
      const validQuestions = {
        questions: [
          {
            id: "q1",
            type: "qcm",
            text: "Test question",
            media: null,
            options: ["A", "B", "C", "D"],
            correct: 0,
            points: 10,
            tie_break: false,
            time_s: 20,
          },
        ],
      };
      (readFile as jest.Mock).mockResolvedValue(JSON.stringify(validQuestions));

      // Act
      const store = QuizStore.getInstance();

      // Wait for async loadQuestionBank to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert: Should have loaded the question
      const questions = store.getAllQuestions();
      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe("q1");
      // Should not have logged any errors
      expect(mockError).not.toHaveBeenCalled();
    });

    it("should skip loading when file does not exist", async () => {
      // Arrange: File does not exist
      (existsSync as jest.Mock).mockReturnValue(false);

      // Act
      const store = QuizStore.getInstance();

      // Wait for async loadQuestionBank to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert: Should have empty question bank and no errors
      const questions = store.getAllQuestions();
      expect(questions).toEqual([]);
      expect(mockError).not.toHaveBeenCalled();
      expect(readFile).not.toHaveBeenCalled();
    });
  });

  describe("saveQuestionBank mutex", () => {
    it("should serialize concurrent saves to prevent file corruption", async () => {
      // Arrange: Track concurrent writes
      let concurrentWrites = 0;
      let maxConcurrentWrites = 0;

      (existsSync as jest.Mock).mockReturnValue(false);
      (writeFile as jest.Mock).mockImplementation(async () => {
        concurrentWrites++;
        maxConcurrentWrites = Math.max(maxConcurrentWrites, concurrentWrites);
        // Simulate slow write
        await new Promise((resolve) => setTimeout(resolve, 50));
        concurrentWrites--;
      });

      const store = QuizStore.getInstance();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Act: Create multiple questions concurrently (simulates bulk import)
      const createPromises = [
        store.createQuestion({ type: "qcm", text: "Q1", media: null, options: ["A", "B"], correct: 0, points: 10, tie_break: false, time_s: 20 }),
        store.createQuestion({ type: "qcm", text: "Q2", media: null, options: ["A", "B"], correct: 0, points: 10, tie_break: false, time_s: 20 }),
        store.createQuestion({ type: "qcm", text: "Q3", media: null, options: ["A", "B"], correct: 0, points: 10, tie_break: false, time_s: 20 }),
      ];

      // Wait for all creates to finish
      await Promise.all(createPromises);
      // Wait for background saves to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Assert: Never more than 1 concurrent write (mutex works)
      expect(maxConcurrentWrites).toBe(1);
    });

    it("should coalesce multiple save requests into fewer actual writes", async () => {
      // Arrange
      (existsSync as jest.Mock).mockReturnValue(false);
      (writeFile as jest.Mock).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      const store = QuizStore.getInstance();
      await new Promise((resolve) => setTimeout(resolve, 50));
      (writeFile as jest.Mock).mockClear();

      // Act: Create 5 questions rapidly (fire-and-forget for coalescing test)
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(store.createQuestion({
          type: "qcm",
          text: `Q${i}`,
          media: null,
          options: ["A", "B"],
          correct: 0,
          points: 10,
          tie_break: false,
          time_s: 20
        }));
      }

      // Wait for all saves to complete
      await Promise.all(promises);

      // Assert: Should have fewer writes than creates due to coalescing
      // With coalescing, we expect at most 2 writes (initial + one coalesced)
      const writeCount = (writeFile as jest.Mock).mock.calls.length;
      expect(writeCount).toBeLessThanOrEqual(2);
      expect(writeCount).toBeGreaterThanOrEqual(1);
    });

    it("should preserve all questions even with concurrent creates", async () => {
      // Arrange
      (existsSync as jest.Mock).mockReturnValue(false);
      let savedData: string | null = null;
      (writeFile as jest.Mock).mockImplementation(async (_path: string, data: string) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        savedData = data;
      });

      const store = QuizStore.getInstance();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Act: Create multiple questions concurrently
      await Promise.all([
        store.createQuestion({ type: "qcm", text: "Q1", media: null, options: ["A", "B"], correct: 0, points: 10, tie_break: false, time_s: 20 }),
        store.createQuestion({ type: "qcm", text: "Q2", media: null, options: ["A", "B"], correct: 1, points: 10, tie_break: false, time_s: 20 }),
        store.createQuestion({ type: "qcm", text: "Q3", media: null, options: ["A", "B"], correct: 0, points: 15, tie_break: false, time_s: 25 }),
      ]);

      // Assert: All 3 questions should be in memory
      const allQuestions = store.getAllQuestions();
      expect(allQuestions).toHaveLength(3);
      expect(allQuestions.map(q => q.text).sort()).toEqual(["Q1", "Q2", "Q3"]);

      // Assert: Final saved data should contain all 3 questions
      expect(savedData).not.toBeNull();
      const parsed = JSON.parse(savedData!);
      expect(parsed.questions).toHaveLength(3);
    });

    it("should guarantee data is persisted when createQuestion resolves", async () => {
      // Verifies saves are awaited, not fire-and-forget
      (existsSync as jest.Mock).mockReturnValue(false);
      let writeCompleted = false;
      (writeFile as jest.Mock).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        writeCompleted = true;
      });

      const store = QuizStore.getInstance();
      await new Promise(resolve => setTimeout(resolve, 50));

      await store.createQuestion({ type: "qcm", text: "Q1", media: null, options: ["A", "B"], correct: 0, points: 10, tie_break: false, time_s: 20 });

      // Write must have completed by the time createQuestion resolves
      expect(writeCompleted).toBe(true);
    });

    it("should guarantee data is persisted when deleteQuestion resolves", async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      let writeCount = 0;
      (writeFile as jest.Mock).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        writeCount++;
      });

      const store = QuizStore.getInstance();
      await new Promise(resolve => setTimeout(resolve, 50));

      const q = await store.createQuestion({ type: "qcm", text: "Q1", media: null, options: ["A", "B"], correct: 0, points: 10, tie_break: false, time_s: 20 });
      const countAfterCreate = writeCount;

      await store.deleteQuestion(q.id);

      // At least one more write happened for the delete
      expect(writeCount).toBeGreaterThan(countAfterCreate);
    });

    it("should guarantee data is persisted when updateQuestion resolves", async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      let lastSavedData: string | null = null;
      (writeFile as jest.Mock).mockImplementation(async (_p: string, data: string) => {
        await new Promise(resolve => setTimeout(resolve, 20));
        lastSavedData = data;
      });

      const store = QuizStore.getInstance();
      await new Promise(resolve => setTimeout(resolve, 50));

      const q = await store.createQuestion({ type: "qcm", text: "Original", media: null, options: ["A", "B"], correct: 0, points: 10, tie_break: false, time_s: 20 });

      await store.updateQuestion(q.id, { text: "Updated" });

      // Saved data must reflect the update
      expect(lastSavedData).not.toBeNull();
      const parsed = JSON.parse(lastSavedData!);
      expect(parsed.questions[0].text).toBe("Updated");
    });

    it("should handle mixed concurrent operations with correct final state", async () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      let lastSavedData: string | null = null;
      (writeFile as jest.Mock).mockImplementation(async (_p: string, data: string) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        lastSavedData = data;
      });

      const store = QuizStore.getInstance();
      await new Promise(resolve => setTimeout(resolve, 50));

      const q1 = await store.createQuestion({ type: "qcm", text: "Q1", media: null, options: ["A", "B"], correct: 0, points: 10, tie_break: false, time_s: 20 });
      const q2 = await store.createQuestion({ type: "qcm", text: "Q2", media: null, options: ["A", "B"], correct: 0, points: 10, tie_break: false, time_s: 20 });

      // Delete first, update second concurrently
      await Promise.all([
        store.deleteQuestion(q1.id),
        store.updateQuestion(q2.id, { text: "Q2 updated" }),
      ]);

      // Final persisted state matches in-memory state
      expect(lastSavedData).not.toBeNull();
      const parsed = JSON.parse(lastSavedData!);
      expect(parsed.questions).toHaveLength(1);
      expect(parsed.questions[0].text).toBe("Q2 updated");
    });
  });
});
