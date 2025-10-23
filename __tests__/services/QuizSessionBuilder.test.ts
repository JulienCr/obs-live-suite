import { QuizStore } from "../../lib/services/QuizStore";

describe("QuizSessionBuilder", () => {
  let store: QuizStore;

  beforeEach(() => {
    store = QuizStore.getInstance();
    // Reset session before each test
    const defaultSession = store.createDefaultSession();
    store.setSession(defaultSession);
  });

  describe("Session Creation", () => {
    it("should create a session with players and rounds", () => {
      const players = [
        { id: "p1", name: "Alice", avatar: "/avatar1.jpg", buzzerId: "buzzer-1" },
        { id: "p2", name: "Bob", avatar: null, buzzerId: "buzzer-2" },
        { id: "p3", name: "Charlie", avatar: "/avatar3.jpg", buzzerId: "buzzer-3" },
        { id: "p4", name: "Diana", avatar: null, buzzerId: "buzzer-4" },
      ];

      const rounds = [
        {
          id: "r1",
          title: "Round 1: General Knowledge",
          questions: [
            {
              id: "q1",
              type: "qcm",
              text: "What is 2+2?",
              options: ["3", "4", "5", "6"],
              correct: 1,
              points: 10,
              tie_break: false,
              time_s: 20,
            },
          ],
        },
      ];

      const session = store.createDefaultSession();
      session.id = "test-session-1";
      session.title = "Test Quiz";
      session.rounds = rounds;

      // Map players with schema-compliant fields
      session.players = players.map((p) => ({
        id: p.id,
        displayName: p.name,
        avatarUrl: p.avatar || undefined,
        buzzerId: p.buzzerId,
      }));

      // Initialize scores
      players.forEach((p) => {
        session.scores.players[p.id] = 0;
      });

      store.setSession(session);

      const retrieved = store.getSession();

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe("test-session-1");
      expect(retrieved?.title).toBe("Test Quiz");
      expect(retrieved?.players).toHaveLength(4);
      expect(retrieved?.players[0].displayName).toBe("Alice");
      expect(retrieved?.players[0].avatarUrl).toBe("/avatar1.jpg");
      expect(retrieved?.players[0].buzzerId).toBe("buzzer-1");
      expect(retrieved?.players[1].avatarUrl).toBeUndefined();
      expect(retrieved?.rounds).toHaveLength(1);
      expect(retrieved?.rounds[0].questions).toHaveLength(1);
      expect(retrieved?.scores.players["p1"]).toBe(0);
      expect(retrieved?.scores.players["p2"]).toBe(0);
    });

    it("should handle session without players", () => {
      const session = store.createDefaultSession();
      session.id = "test-session-2";
      session.title = "Empty Quiz";
      session.players = [];
      session.rounds = [];

      store.setSession(session);

      const retrieved = store.getSession();

      expect(retrieved).not.toBeNull();
      expect(retrieved?.players).toHaveLength(0);
      expect(retrieved?.rounds).toHaveLength(0);
    });

    it("should correctly map player fields from builder format to schema", () => {
      // Simulate data coming from SessionBuilder component
      const builderPlayers = [
        { id: "guest-1", name: "John Doe", avatar: "/john.jpg", buzzerId: "b1" },
        { id: "guest-2", name: "Jane Smith", avatar: null, buzzerId: "b2" },
      ];

      const session = store.createDefaultSession();
      
      // Map like the API endpoint does
      session.players = builderPlayers.map((p) => ({
        id: p.id,
        displayName: p.name, // name → displayName
        avatarUrl: p.avatar || undefined, // avatar → avatarUrl
        buzzerId: p.buzzerId,
      }));

      builderPlayers.forEach((p) => {
        session.scores.players[p.id] = 0;
      });

      store.setSession(session);

      const retrieved = store.getSession();

      expect(retrieved?.players[0].displayName).toBe("John Doe");
      expect(retrieved?.players[0].avatarUrl).toBe("/john.jpg");
      expect(retrieved?.players[1].displayName).toBe("Jane Smith");
      expect(retrieved?.players[1].avatarUrl).toBeUndefined();
    });

    it("should create questions in the question bank", () => {
      const question = store.createQuestion({
        type: "qcm",
        text: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correct: 2,
        points: 10,
        tie_break: false,
        time_s: 20,
      });

      expect(question.id).toBeDefined();
      expect(question.text).toBe("What is the capital of France?");
      expect(question.options).toHaveLength(4);

      const allQuestions = store.getAllQuestions();
      expect(allQuestions.length).toBeGreaterThan(0);
      expect(allQuestions.find((q) => q.id === question.id)).toBeDefined();
    });

    it("should update questions in the question bank", () => {
      const question = store.createQuestion({
        type: "qcm",
        text: "Original question",
        options: ["A", "B", "C", "D"],
        correct: 0,
        points: 10,
        tie_break: false,
        time_s: 20,
      });

      const updated = store.updateQuestion(question.id, {
        text: "Updated question",
        points: 20,
      });

      expect(updated.text).toBe("Updated question");
      expect(updated.points).toBe(20);
      expect(updated.options).toEqual(["A", "B", "C", "D"]); // Should keep other fields
    });

    it("should delete questions from the question bank", () => {
      const question = store.createQuestion({
        type: "qcm",
        text: "To be deleted",
        options: ["A", "B", "C", "D"],
        correct: 0,
        points: 10,
        tie_break: false,
        time_s: 20,
      });

      const beforeDelete = store.getAllQuestions().length;
      store.deleteQuestion(question.id);
      const afterDelete = store.getAllQuestions().length;

      expect(afterDelete).toBe(beforeDelete - 1);
      expect(store.getQuestion(question.id)).toBeUndefined();
    });

    it("should handle image QCM questions", () => {
      const question = store.createQuestion({
        type: "image",
        text: "Which one is a cat?",
        options: [
          "http://example.com/img1.jpg",
          "http://example.com/img2.jpg",
          "http://example.com/img3.jpg",
          "http://example.com/img4.jpg",
        ],
        correct: 2,
        points: 15,
        tie_break: false,
        time_s: 30,
      });

      expect(question.type).toBe("image");
      expect(question.options?.[0]).toContain("http://");
      expect(question.correct).toBe(2);
    });

    it("should handle closest number questions", () => {
      const question = store.createQuestion({
        type: "closest",
        text: "How many countries are in Europe?",
        correct: 44, // Target number
        points: 20,
        tie_break: false,
        time_s: 30,
      });

      expect(question.type).toBe("closest");
      expect(question.correct).toBe(44);
      expect(question.options).toBeUndefined();
    });

    it("should handle open questions", () => {
      const question = store.createQuestion({
        type: "open",
        text: "Describe your favorite programming language",
        points: 25,
        tie_break: false,
        time_s: 60,
      });

      expect(question.type).toBe("open");
      expect(question.options).toBeUndefined();
      expect(question.correct).toBeUndefined();
    });

    it("should handle questions with explanation field", () => {
      const question = store.createQuestion({
        type: "qcm",
        text: "What is the capital of France?",
        options: ["London", "Paris", "Berlin", "Madrid"],
        correct: 1,
        points: 10,
        tie_break: false,
        time_s: 20,
        explanation: "Paris has been the capital of France since the 12th century.",
      });

      expect(question.explanation).toBe("Paris has been the capital of France since the 12th century.");
      expect(question.type).toBe("qcm");
      expect(question.correct).toBe(1);
    });

    it("should maintain score integrity when creating session", () => {
      const players = [
        { id: "p1", name: "Player 1", avatar: null, buzzerId: "b1" },
        { id: "p2", name: "Player 2", avatar: null, buzzerId: "b2" },
      ];

      const session = store.createDefaultSession();
      session.players = players.map((p) => ({
        id: p.id,
        displayName: p.name,
        buzzerId: p.buzzerId,
      }));

      players.forEach((p) => {
        session.scores.players[p.id] = 0;
      });

      store.setSession(session);

      // Update a score
      store.addScorePlayer("p1", 10);

      const retrieved = store.getSession();
      expect(retrieved?.scores.players["p1"]).toBe(10);
      expect(retrieved?.scores.players["p2"]).toBe(0);
    });
  });

  describe("Round Management", () => {
    it("should create rounds with questions", () => {
      const round = store.createRound({
        title: "Science Round",
        questions: [
          {
            id: "q1",
            type: "qcm",
            text: "What is H2O?",
            options: ["Water", "Hydrogen", "Oxygen", "Peroxide"],
            correct: 0,
            points: 10,
            tie_break: false,
            time_s: 20,
          },
        ],
      });

      expect(round.id).toBeDefined();
      expect(round.title).toBe("Science Round");
      expect(round.questions).toHaveLength(1);
    });

    it("should update rounds", () => {
      const round = store.createRound({
        title: "Original Title",
        questions: [],
      });

      const updated = store.updateRound(round.id, {
        title: "Updated Title",
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.id).toBe(round.id);
    });

    it("should delete rounds", () => {
      const round = store.createRound({
        title: "To be deleted",
        questions: [],
      });

      const beforeDelete = store.getAllRounds().length;
      store.deleteRound(round.id);
      const afterDelete = store.getAllRounds().length;

      expect(afterDelete).toBe(beforeDelete - 1);
      expect(store.getRound(round.id)).toBeUndefined();
    });
  });

  describe("Session State Tracking", () => {
    it("should track current round and question indices", () => {
      const session = store.createDefaultSession();
      session.rounds = [
        {
          id: "r1",
          title: "Round 1",
          questions: [
            {
              id: "q1",
              type: "qcm",
              text: "Q1",
              options: ["A", "B", "C", "D"],
              correct: 0,
              points: 10,
              tie_break: false,
              time_s: 20,
            },
            {
              id: "q2",
              type: "qcm",
              text: "Q2",
              options: ["A", "B", "C", "D"],
              correct: 1,
              points: 10,
              tie_break: false,
              time_s: 20,
            },
          ],
        },
      ];
      session.currentRoundIndex = 0;
      session.currentQuestionIndex = 0;

      store.setSession(session);

      const retrieved = store.getSession();
      expect(retrieved?.currentRoundIndex).toBe(0);
      expect(retrieved?.currentQuestionIndex).toBe(0);

      // Simulate moving to next question
      if (retrieved) {
        retrieved.currentQuestionIndex = 1;
        store.setSession(retrieved);
      }

      const updated = store.getSession();
      expect(updated?.currentQuestionIndex).toBe(1);
    });
  });
});

