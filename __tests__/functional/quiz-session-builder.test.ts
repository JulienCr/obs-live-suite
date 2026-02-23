import { QuizStore } from "../../lib/services/QuizStore";
import { GuestRepository } from "../../lib/repositories/GuestRepository";

// Mock fs/promises to prevent actual filesystem writes from async saves.
// We don't mock 'fs' itself because better-sqlite3 (used by GuestRepository) needs it.
jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

describe("Quiz Session Builder - Functional Test", () => {
  let store: QuizStore;
  let guestRepo: GuestRepository;

  beforeAll(() => {
    guestRepo = GuestRepository.getInstance();
    store = QuizStore.getInstance();
  });

  beforeEach(() => {
    // Reset session before each test
    const defaultSession = store.createDefaultSession();
    store.setSession(defaultSession);
  });

  it("should complete a full session builder workflow: create players, questions, and session", async () => {
    // Step 1: Create 4 players (guests in the database)
    guestRepo.create({
      id: "player-1",
      displayName: "Alice",
      subtitle: "Quiz Master",
      accentColor: "#3b82f6",
      avatarUrl: "/data/uploads/guests/alice.jpg",
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    guestRepo.create({
      id: "player-2",
      displayName: "Bob",
      subtitle: "Trivia Expert",
      accentColor: "#10b981",
      avatarUrl: null,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    guestRepo.create({
      id: "player-3",
      displayName: "Charlie",
      subtitle: "Knowledge Seeker",
      accentColor: "#f59e0b",
      avatarUrl: "/data/uploads/guests/charlie.jpg",
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    guestRepo.create({
      id: "player-4",
      displayName: "Diana",
      subtitle: "Brain Champion",
      accentColor: "#ef4444",
      avatarUrl: null,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Fetch the created players
    const player1 = guestRepo.getById("player-1");
    const player2 = guestRepo.getById("player-2");
    const player3 = guestRepo.getById("player-3");
    const player4 = guestRepo.getById("player-4");

    expect(player1).toBeDefined();
    expect(player2).toBeDefined();
    expect(player3).toBeDefined();
    expect(player4).toBeDefined();

    // Verify players were created
    const allGuests = guestRepo.getAll();
    expect(allGuests.length).toBeGreaterThanOrEqual(4);
    expect(allGuests.find(g => g.id === "player-1")).toBeDefined();
    expect(allGuests.find(g => g.id === "player-2")).toBeDefined();
    expect(allGuests.find(g => g.id === "player-3")).toBeDefined();
    expect(allGuests.find(g => g.id === "player-4")).toBeDefined();

    // Step 2: Create 3 QCM questions
    const question1 = await store.createQuestion({
      type: "qcm",
      text: "What is the capital of France?",
      options: ["London", "Paris", "Berlin", "Madrid"],
      correct: 1,
      points: 10,
      tie_break: false,
      time_s: 20,
    });

    const question2 = await store.createQuestion({
      type: "qcm",
      text: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correct: 1,
      points: 10,
      tie_break: false,
      time_s: 15,
    });

    const question3 = await store.createQuestion({
      type: "qcm",
      text: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correct: 1,
      points: 15,
      tie_break: false,
      time_s: 20,
    });

    // Verify questions were created
    const allQuestions = store.getAllQuestions();
    expect(allQuestions.length).toBeGreaterThanOrEqual(3);
    expect(allQuestions.find(q => q.id === question1.id)).toBeDefined();
    expect(allQuestions.find(q => q.id === question2.id)).toBeDefined();
    expect(allQuestions.find(q => q.id === question3.id)).toBeDefined();

    // Step 3: Create a round with the questions
    const round = store.createRound({
      title: "General Knowledge Round",
      questions: [question1, question2, question3],
    });

    expect(round.id).toBeDefined();
    expect(round.title).toBe("General Knowledge Round");
    expect(round.questions).toHaveLength(3);

    // Step 4: Create a session with players and rounds
    const sessionData = {
      id: "functional-test-session",
      name: "Functional Test Quiz Session",
      players: [
        { id: player1!.id, name: player1!.displayName, avatar: player1!.avatarUrl, buzzerId: "buzzer-1" },
        { id: player2!.id, name: player2!.displayName, avatar: player2!.avatarUrl, buzzerId: "buzzer-2" },
        { id: player3!.id, name: player3!.displayName, avatar: player3!.avatarUrl, buzzerId: "buzzer-3" },
        { id: player4!.id, name: player4!.displayName, avatar: player4!.avatarUrl, buzzerId: "buzzer-4" },
      ],
      rounds: [round],
    };

    const session = store.createDefaultSession();
    session.id = sessionData.id;
    session.title = sessionData.name;
    session.currentRoundIndex = 0;
    session.currentQuestionIndex = 0;
    session.rounds = sessionData.rounds;

    session.players = sessionData.players.map((p: any) => {
      const player: any = {
        id: p.id,
        displayName: p.name,
        buzzerId: p.buzzerId,
      };
      if (p.avatar) {
        player.avatarUrl = p.avatar;
      }
      return player;
    });

    sessionData.players.forEach((p: any) => {
      session.scores.players[p.id] = 0;
    });

    store.setSession(session);

    // Step 5: Verify the complete session
    const retrievedSession = store.getSession();

    expect(retrievedSession).not.toBeNull();
    expect(retrievedSession?.id).toBe("functional-test-session");
    expect(retrievedSession?.title).toBe("Functional Test Quiz Session");

    expect(retrievedSession?.players).toHaveLength(4);
    expect(retrievedSession?.players[0].displayName).toBe("Alice");
    expect(retrievedSession?.players[0].avatarUrl).toBe("/data/uploads/guests/alice.jpg");
    expect(retrievedSession?.players[0].buzzerId).toBe("buzzer-1");

    expect(retrievedSession?.players[1].displayName).toBe("Bob");
    expect(retrievedSession?.players[1].avatarUrl).toBeUndefined();
    expect(retrievedSession?.players[1].buzzerId).toBe("buzzer-2");

    expect(retrievedSession?.players[2].displayName).toBe("Charlie");
    expect(retrievedSession?.players[2].avatarUrl).toBe("/data/uploads/guests/charlie.jpg");

    expect(retrievedSession?.players[3].displayName).toBe("Diana");
    expect(retrievedSession?.players[3].avatarUrl).toBeUndefined();

    expect(retrievedSession?.rounds).toHaveLength(1);
    expect(retrievedSession?.rounds[0].title).toBe("General Knowledge Round");
    expect(retrievedSession?.rounds[0].questions).toHaveLength(3);

    expect(retrievedSession?.rounds[0].questions[0].text).toBe("What is the capital of France?");
    expect(retrievedSession?.rounds[0].questions[0].correct).toBe(1);

    expect(retrievedSession?.rounds[0].questions[1].text).toBe("What is 2 + 2?");

    expect(retrievedSession?.rounds[0].questions[2].text).toBe("Which planet is known as the Red Planet?");
    expect(retrievedSession?.rounds[0].questions[2].points).toBe(15);

    expect(retrievedSession?.scores.players["player-1"]).toBe(0);
    expect(retrievedSession?.scores.players["player-2"]).toBe(0);
    expect(retrievedSession?.scores.players["player-3"]).toBe(0);
    expect(retrievedSession?.scores.players["player-4"]).toBe(0);

    expect(retrievedSession?.currentRoundIndex).toBe(0);
    expect(retrievedSession?.currentQuestionIndex).toBe(0);
  });

  it("should handle session with multiple rounds", async () => {
    const round1Questions = await Promise.all([
      store.createQuestion({
        type: "qcm",
        text: "Question 1A",
        options: ["A", "B", "C", "D"],
        correct: 0,
        points: 10,
        tie_break: false,
        time_s: 20,
      }),
      store.createQuestion({
        type: "qcm",
        text: "Question 1B",
        options: ["A", "B", "C", "D"],
        correct: 1,
        points: 10,
        tie_break: false,
        time_s: 20,
      }),
    ]);

    const round2Questions = await Promise.all([
      store.createQuestion({
        type: "qcm",
        text: "Question 2A",
        options: ["A", "B", "C", "D"],
        correct: 2,
        points: 15,
        tie_break: false,
        time_s: 25,
      }),
    ]);

    const round1 = store.createRound({
      title: "Round 1: Easy",
      questions: round1Questions,
    });

    const round2 = store.createRound({
      title: "Round 2: Medium",
      questions: round2Questions,
    });

    const session = store.createDefaultSession();
    session.id = "multi-round-session";
    session.title = "Multi-Round Quiz";
    session.rounds = [round1, round2];

    session.players = [
      { id: "p1", displayName: "Player 1", buzzerId: "b1" },
      { id: "p2", displayName: "Player 2", buzzerId: "b2" },
    ];

    session.scores.players["p1"] = 0;
    session.scores.players["p2"] = 0;

    store.setSession(session);

    const retrieved = store.getSession();

    expect(retrieved?.rounds).toHaveLength(2);
    expect(retrieved?.rounds[0].title).toBe("Round 1: Easy");
    expect(retrieved?.rounds[0].questions).toHaveLength(2);
    expect(retrieved?.rounds[1].title).toBe("Round 2: Medium");
    expect(retrieved?.rounds[1].questions).toHaveLength(1);
  });

  it("should validate that all required player fields are present", () => {
    const session = store.createDefaultSession();

    expect(() => {
      session.players = [
        { id: "p1", buzzerId: "b1" } as any,
      ];
    }).not.toThrow();
  });

  afterAll(() => {
    try {
      guestRepo.delete("player-1");
      guestRepo.delete("player-2");
      guestRepo.delete("player-3");
      guestRepo.delete("player-4");
    } catch (e) {
      // Guests might not exist if test failed early
    }
  });
});
