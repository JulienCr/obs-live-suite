import { QuizManager, QuizPhase } from "@/lib/services/QuizManager";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { QuizStore } from "@/lib/services/QuizStore";
import { QuizTimer } from "@/lib/services/QuizTimer";
import { QuizZoomController } from "@/lib/services/QuizZoomController";
import { QuizMysteryImageController } from "@/lib/services/QuizMysteryImageController";
import { QuizBuzzerService } from "@/lib/services/QuizBuzzerService";
import { OverlayChannel } from "@/lib/models/OverlayEvents";
import { QUIZ, BUZZER } from "@/lib/config/Constants";
import type { Session, Question, Round, Player } from "@/lib/models/Quiz";

// Mock Logger
jest.mock("@/lib/utils/Logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock ChannelManager
const mockPublish = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/services/ChannelManager", () => ({
  ChannelManager: {
    getInstance: jest.fn(() => ({
      publish: mockPublish,
    })),
  },
}));

// Mock QuizStore
const mockGetSession = jest.fn();
const mockSetSession = jest.fn();
const mockCreateDefaultSession = jest.fn();
const mockAddScorePlayer = jest.fn();
jest.mock("@/lib/services/QuizStore", () => ({
  QuizStore: {
    getInstance: jest.fn(() => ({
      getSession: mockGetSession,
      setSession: mockSetSession,
      createDefaultSession: mockCreateDefaultSession,
      addScorePlayer: mockAddScorePlayer,
    })),
  },
}));

// Mock QuizTimer
const mockTimerStart = jest.fn().mockResolvedValue(undefined);
const mockTimerStop = jest.fn().mockResolvedValue(undefined);
const mockTimerPause = jest.fn().mockResolvedValue(undefined);
const mockTimerResume = jest.fn().mockResolvedValue(undefined);
const mockTimerAddTime = jest.fn().mockResolvedValue(undefined);
const mockTimerGetSeconds = jest.fn().mockReturnValue(20);
const mockTimerIsRunning = jest.fn().mockReturnValue(false);
const mockTimerGetPhase = jest.fn().mockReturnValue("idle");
jest.mock("@/lib/services/QuizTimer", () => ({
  QuizTimer: jest.fn().mockImplementation(() => ({
    start: mockTimerStart,
    stop: mockTimerStop,
    pause: mockTimerPause,
    resume: mockTimerResume,
    addTime: mockTimerAddTime,
    getSeconds: mockTimerGetSeconds,
    isRunning: mockTimerIsRunning,
    getPhase: mockTimerGetPhase,
  })),
}));

// Mock QuizZoomController
const mockZoomStart = jest.fn().mockResolvedValue(undefined);
const mockZoomStop = jest.fn().mockResolvedValue(undefined);
const mockZoomResume = jest.fn().mockResolvedValue(undefined);
const mockZoomStep = jest.fn().mockResolvedValue(undefined);
const mockZoomReset = jest.fn();
const mockZoomGetInternalConfig = jest.fn().mockReturnValue({ steps: 1350, maxZoom: 35 });
jest.mock("@/lib/services/QuizZoomController", () => ({
  QuizZoomController: jest.fn().mockImplementation(() => ({
    start: mockZoomStart,
    stop: mockZoomStop,
    resume: mockZoomResume,
    step: mockZoomStep,
    reset: mockZoomReset,
    getInternalConfig: mockZoomGetInternalConfig,
  })),
}));

// Mock QuizMysteryImageController
const mockMysteryStart = jest.fn().mockResolvedValue(undefined);
const mockMysteryStop = jest.fn().mockResolvedValue(undefined);
const mockMysteryResume = jest.fn().mockResolvedValue(undefined);
const mockMysteryStep = jest.fn().mockResolvedValue(undefined);
const mockMysteryReset = jest.fn();
const mockMysteryGetState = jest.fn().mockReturnValue({ revealed: 0, total: 0, running: false });
jest.mock("@/lib/services/QuizMysteryImageController", () => ({
  QuizMysteryImageController: jest.fn().mockImplementation(() => ({
    start: mockMysteryStart,
    stop: mockMysteryStop,
    resume: mockMysteryResume,
    step: mockMysteryStep,
    reset: mockMysteryReset,
    getState: mockMysteryGetState,
  })),
}));

// Mock QuizBuzzerService
const mockBuzzerHit = jest.fn().mockReturnValue({ accepted: false });
const mockBuzzerForceLock = jest.fn();
const mockBuzzerRelease = jest.fn();
jest.mock("@/lib/services/QuizBuzzerService", () => ({
  QuizBuzzerService: jest.fn().mockImplementation(() => ({
    hit: mockBuzzerHit,
    forceLock: mockBuzzerForceLock,
    release: mockBuzzerRelease,
  })),
}));

// Mock quiz-bot import for resetViewerInputs
jest.mock("../../server/api/quiz-bot", () => ({
  resetViewerInputs: jest.fn(),
}));

describe("QuizManager", () => {
  // Sample data for tests
  const sampleQuestion: Question = {
    id: "q-1",
    type: "qcm",
    text: "What is 2+2?",
    options: ["3", "4", "5", "6"],
    correct: 1, // Index of correct answer (B = 4)
    points: 10,
    time_s: 20,
    tie_break: false,
    media: null,
  };

  const sampleQuestion2: Question = {
    id: "q-2",
    type: "closest",
    text: "How many stars in the galaxy?",
    correct: 100000000000,
    points: 20,
    time_s: 30,
    tie_break: false,
    media: "/images/galaxy.jpg",
  };

  const sampleMysteryQuestion: Question = {
    id: "q-3",
    type: "image",
    mode: "mystery_image",
    text: "Who is this person?",
    correct: "Einstein",
    points: 15,
    time_s: 25,
    tie_break: false,
    media: "/images/mystery.jpg",
  };

  const sampleZoomQuestion: Question = {
    id: "q-4",
    type: "image",
    mode: "image_zoombuzz",
    text: "What is this landmark?",
    correct: "Eiffel Tower",
    points: 10,
    time_s: 45,
    tie_break: false,
    media: "/images/landmark.jpg",
  };

  const sampleRound: Round = {
    id: "round-1",
    title: "General Knowledge",
    questions: [sampleQuestion, sampleQuestion2],
  };

  const samplePlayer: Player = {
    id: "player-1",
    displayName: "Alice",
    accentColor: "#ff0000",
  };

  const samplePlayer2: Player = {
    id: "player-2",
    displayName: "Bob",
    accentColor: "#00ff00",
  };

  const sampleSession: Session = {
    id: "session-1",
    title: "Test Quiz",
    rounds: [sampleRound],
    currentRoundIndex: 0,
    currentQuestionIndex: 0,
    players: [samplePlayer, samplePlayer2],
    config: {
      closest_k: 1,
      time_defaults: { qcm: 20, image: 20, closest: 20, open: 30 },
      viewers_weight: 1,
      players_weight: 1,
      allow_multiple_attempts: false,
      first_or_last_wins: "last",
      topN: 10,
      viewers: { allow_answers_in_zoombuzz: false },
    },
    scores: { players: {}, viewers: {} },
    playerAnswers: {},
    scorePanelVisible: true,
  };

  beforeEach(() => {
    // Reset singleton instance for isolation
    (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockCreateDefaultSession.mockReturnValue(sampleSession);
    mockGetSession.mockReturnValue(sampleSession);
    mockAddScorePlayer.mockReturnValue(10);
  });

  // ============================================================================
  // SINGLETON PATTERN TESTS
  // ============================================================================
  
  describe("getInstance", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = QuizManager.getInstance();
      const instance2 = QuizManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it("should create a new instance if none exists", () => {
      const instance = QuizManager.getInstance();
      
      expect(instance).toBeInstanceOf(QuizManager);
    });

    it("should initialize with idle phase", () => {
      const manager = QuizManager.getInstance();
      
      expect(manager.getPhase()).toBe("idle");
    });

    it("should use Constants for zoom configuration", () => {
      QuizManager.getInstance();
      
      expect(QuizZoomController).toHaveBeenCalledWith({
        durationSeconds: QUIZ.ZOOM_DURATION_SECONDS,
        maxZoom: QUIZ.ZOOM_MAX_LEVEL,
        fps: QUIZ.ZOOM_FPS,
      });
    });

    it("should use Constants for mystery image configuration", () => {
      QuizManager.getInstance();
      
      expect(QuizMysteryImageController).toHaveBeenCalledWith({
        intervalMs: QUIZ.MYSTERY_IMAGE_INTERVAL_MS,
      });
    });

    it("should use Constants for buzzer configuration", () => {
      QuizManager.getInstance();
      
      expect(QuizBuzzerService).toHaveBeenCalledWith({
        lockMs: BUZZER.LOCK_DELAY_MS,
        steal: false,
        stealWindowMs: BUZZER.STEAL_WINDOW_MS,
      });
    });
  });

  // ============================================================================
  // SESSION MANAGEMENT TESTS
  // ============================================================================
  
  describe("getSession", () => {
    it("should return session from store", () => {
      const manager = QuizManager.getInstance();
      
      const session = manager.getSession();
      
      expect(session).toEqual(sampleSession);
      expect(mockGetSession).toHaveBeenCalled();
    });

    it("should return null when no session exists", () => {
      mockGetSession.mockReturnValue(null);
      const manager = QuizManager.getInstance();
      
      const session = manager.getSession();
      
      expect(session).toBeNull();
    });
  });

  // ============================================================================
  // ROUND MANAGEMENT TESTS
  // ============================================================================
  
  describe("startRound", () => {
    it("should set currentRoundIndex and reset questionIndex", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.startRound(0);
      
      expect(sampleSession.currentRoundIndex).toBe(0);
      expect(sampleSession.currentQuestionIndex).toBe(0);
    });

    it("should publish quiz.start_round event", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.startRound(0);
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "quiz.start_round",
        { round_id: "round-1" }
      );
    });

    it("should throw error when no active session", async () => {
      mockGetSession.mockReturnValue(null);
      const manager = QuizManager.getInstance();
      
      await expect(manager.startRound(0)).rejects.toThrow("No active quiz session");
    });
  });

  describe("endRound", () => {
    it("should publish quiz.end_round event", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.endRound();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "quiz.end_round",
        {}
      );
    });
  });

  // ============================================================================
  // QUESTION STATE MACHINE TESTS
  // ============================================================================
  
  describe("showCurrentQuestion", () => {
    it("should reset mystery and zoom controllers", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.showCurrentQuestion();
      
      expect(mockMysteryReset).toHaveBeenCalled();
      expect(mockZoomReset).toHaveBeenCalled();
    });

    it("should clear player answers", async () => {
      const sessionWithAnswers = { ...sampleSession, playerAnswers: { "player-1": "A" } };
      mockGetSession.mockReturnValue(sessionWithAnswers);
      const manager = QuizManager.getInstance();
      
      await manager.showCurrentQuestion();
      
      expect(mockSetSession).toHaveBeenCalledWith(
        expect.objectContaining({ playerAnswers: {} })
      );
    });

    it("should transition phase to accept_answers", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.showCurrentQuestion();
      
      expect(manager.getPhase()).toBe("accept_answers");
    });

    it("should publish question.show event with zoom config", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.showCurrentQuestion();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "question.show",
        expect.objectContaining({
          question_id: "q-1",
          zoom_steps: 1350,
          zoom_maxZoom: 35,
        })
      );
    });

    it("should publish phase.update event", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.showCurrentQuestion();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "phase.update",
        expect.objectContaining({
          phase: "accept_answers",
          question_id: "q-1",
        })
      );
    });

    it("should start timer with question time_s", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.showCurrentQuestion();
      
      expect(mockTimerStart).toHaveBeenCalledWith(20, "accept_answers");
    });

    it("should use DEFAULT_TIMER_SECONDS when question has no time_s", async () => {
      const questionNoTime = { ...sampleQuestion, time_s: undefined };
      const sessionNoTime = {
        ...sampleSession,
        rounds: [{ ...sampleRound, questions: [questionNoTime] }],
      };
      mockGetSession.mockReturnValue(sessionNoTime);
      const manager = QuizManager.getInstance();
      
      await manager.showCurrentQuestion();
      
      expect(mockTimerStart).toHaveBeenCalledWith(QUIZ.DEFAULT_TIMER_SECONDS, "accept_answers");
    });

    it("should publish vote.update event to reset UI", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.showCurrentQuestion();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "vote.update",
        {
          counts: { A: 0, B: 0, C: 0, D: 0 },
          percentages: { A: 0, B: 0, C: 0, D: 0 },
        }
      );
    });

    it("should throw error when no current round", async () => {
      const sessionNoRounds = { ...sampleSession, rounds: [] };
      mockGetSession.mockReturnValue(sessionNoRounds);
      const manager = QuizManager.getInstance();
      
      await expect(manager.showCurrentQuestion()).rejects.toThrow("No current round");
    });

    it("should throw error when no current question", async () => {
      const roundNoQuestions = { ...sampleRound, questions: [] };
      const sessionNoQuestions = { ...sampleSession, rounds: [roundNoQuestions] };
      mockGetSession.mockReturnValue(sessionNoQuestions);
      const manager = QuizManager.getInstance();
      
      await expect(manager.showCurrentQuestion()).rejects.toThrow("No current question");
    });
  });

  describe("lockAnswers", () => {
    it("should transition phase to lock", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.lockAnswers();
      
      expect(manager.getPhase()).toBe("lock");
    });

    it("should publish question.lock event", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.lockAnswers();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "question.lock",
        { question_id: "q-1" }
      );
    });

    it("should pause the timer", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.lockAnswers();
      
      expect(mockTimerPause).toHaveBeenCalled();
    });
  });

  describe("reveal", () => {
    it("should stop the timer", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.reveal();
      
      expect(mockTimerStop).toHaveBeenCalled();
    });

    it("should stop mystery reveal for mystery_image questions", async () => {
      const sessionWithMystery = {
        ...sampleSession,
        rounds: [{ ...sampleRound, questions: [sampleMysteryQuestion] }],
      };
      mockGetSession.mockReturnValue(sessionWithMystery);
      const manager = QuizManager.getInstance();
      
      await manager.reveal();
      
      expect(mockMysteryStop).toHaveBeenCalled();
    });

    it("should stop zoom and emit completion for image_zoombuzz questions", async () => {
      const sessionWithZoom = {
        ...sampleSession,
        rounds: [{ ...sampleRound, questions: [sampleZoomQuestion] }],
      };
      mockGetSession.mockReturnValue(sessionWithZoom);
      const manager = QuizManager.getInstance();
      
      await manager.reveal();
      
      expect(mockZoomStop).toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "zoom.complete",
        { total: 1350, maxZoom: 35 }
      );
    });

    it("should transition to reveal then score_update phase", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.reveal();
      
      // Final phase should be score_update
      expect(manager.getPhase()).toBe("score_update");
    });

    it("should publish question.reveal event with correct answer", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.reveal();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "question.reveal",
        { question_id: "q-1", correct: 1 }
      );
    });

    it("should publish question.revealed event after scoring", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.reveal();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "question.revealed",
        expect.objectContaining({
          question_id: "q-1",
          correct: 1,
          scores_applied: true,
        })
      );
    });

    it("should publish leaderboard.push event", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.reveal();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "leaderboard.push",
        expect.objectContaining({ topN: expect.any(Array) })
      );
    });

    it("should publish question.finished event", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.reveal();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "question.finished",
        { question_id: "q-1" }
      );
    });

    it("should publish question.next_ready when more questions available", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.reveal();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "question.next_ready",
        { next_id: "q-2" }
      );
    });

    it("should not publish next_ready when no more questions", async () => {
      const singleQuestionSession = {
        ...sampleSession,
        rounds: [{ ...sampleRound, questions: [sampleQuestion] }],
      };
      mockGetSession.mockReturnValue(singleQuestionSession);
      const manager = QuizManager.getInstance();
      
      await manager.reveal();
      
      const nextReadyCalls = mockPublish.mock.calls.filter(
        (call) => call[1] === "question.next_ready"
      );
      expect(nextReadyCalls).toHaveLength(0);
    });
  });

  describe("nextQuestion", () => {
    it("should increment currentQuestionIndex", async () => {
      // Use a fresh session object for mutation tests
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      mockGetSession.mockReturnValue(freshSession);
      const manager = QuizManager.getInstance();

      await manager.nextQuestion();

      expect(freshSession.currentQuestionIndex).toBe(1);
    });

    it("should transition to idle phase", async () => {
      // Use a fresh session to avoid conflicts from prior tests
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      mockGetSession.mockReturnValue(freshSession);
      const manager = QuizManager.getInstance();
      // First put into a non-idle phase
      await manager.showCurrentQuestion();
      jest.clearAllMocks(); // Clear mocks to isolate nextQuestion behavior
      mockGetSession.mockReturnValue(freshSession);

      await manager.nextQuestion();

      expect(manager.getPhase()).toBe("idle");
    });

    it("should stop the timer", async () => {
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      mockGetSession.mockReturnValue(freshSession);
      const manager = QuizManager.getInstance();

      await manager.nextQuestion();

      expect(mockTimerStop).toHaveBeenCalled();
    });

    it("should clear player answers", async () => {
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      mockGetSession.mockReturnValue(freshSession);
      const manager = QuizManager.getInstance();

      await manager.nextQuestion();

      expect(mockSetSession).toHaveBeenCalledWith(
        expect.objectContaining({ playerAnswers: {} })
      );
    });

    it("should publish question.change event", async () => {
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      mockGetSession.mockReturnValue(freshSession);
      const manager = QuizManager.getInstance();

      await manager.nextQuestion();

      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "question.change",
        { question_id: "q-2", clear_assignments: true }
      );
    });

    it("should not change index when at last question", async () => {
      const lastQuestionSession = {
        ...sampleSession,
        currentQuestionIndex: 1, // Already at last question
      };
      mockGetSession.mockReturnValue(lastQuestionSession);
      const manager = QuizManager.getInstance();

      await manager.nextQuestion();

      // Should not have called publish for question.change
      const changeCalls = mockPublish.mock.calls.filter(
        (call) => call[1] === "question.change"
      );
      expect(changeCalls).toHaveLength(0);
    });
  });

  describe("prevQuestion", () => {
    it("should decrement currentQuestionIndex", async () => {
      const session = { ...sampleSession, currentQuestionIndex: 1 };
      mockGetSession.mockReturnValue(session);
      const manager = QuizManager.getInstance();
      
      await manager.prevQuestion();
      
      expect(session.currentQuestionIndex).toBe(0);
    });

    it("should not change index when at first question", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.prevQuestion();
      
      expect(sampleSession.currentQuestionIndex).toBe(0);
    });

    it("should transition to idle phase", async () => {
      const session = { ...sampleSession, currentQuestionIndex: 1 };
      mockGetSession.mockReturnValue(session);
      const manager = QuizManager.getInstance();
      await manager.showCurrentQuestion();
      
      await manager.prevQuestion();
      
      expect(manager.getPhase()).toBe("idle");
    });
  });

  describe("selectQuestion", () => {
    it("should set currentQuestionIndex to matching question", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.selectQuestion("q-2");
      
      expect(sampleSession.currentQuestionIndex).toBe(1);
    });

    it("should not change index for non-existent question", async () => {
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      freshSession.currentQuestionIndex = 0;
      mockGetSession.mockReturnValue(freshSession);

      // Reset singleton to get clean state
      (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
      const manager = QuizManager.getInstance();

      await manager.selectQuestion("non-existent");

      // Index should remain at 0 since question not found
      expect(freshSession.currentQuestionIndex).toBe(0);
    });

    it("should publish question.change event for valid question", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.selectQuestion("q-2");
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "question.change",
        { question_id: "q-2", clear_assignments: true }
      );
    });
  });

  describe("resetQuestion", () => {
    it("should clear player answers", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.resetQuestion();
      
      expect(mockSetSession).toHaveBeenCalledWith(
        expect.objectContaining({ playerAnswers: {} })
      );
    });

    it("should stop timer", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.resetQuestion();
      
      expect(mockTimerStop).toHaveBeenCalled();
    });

    it("should transition to idle phase", async () => {
      const manager = QuizManager.getInstance();
      await manager.showCurrentQuestion();
      
      await manager.resetQuestion();
      
      expect(manager.getPhase()).toBe("idle");
    });

    it("should publish question.reset event", async () => {
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      freshSession.currentQuestionIndex = 0;
      mockGetSession.mockReturnValue(freshSession);

      // Reset singleton to get clean state
      (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
      const manager = QuizManager.getInstance();

      await manager.resetQuestion();

      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "question.reset",
        { question_id: "q-1" }
      );
    });

    it("should publish vote.update to reset UI", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.resetQuestion();
      
      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "vote.update",
        {
          counts: { A: 0, B: 0, C: 0, D: 0 },
          percentages: { A: 0, B: 0, C: 0, D: 0 },
        }
      );
    });
  });

  // ============================================================================
  // PLAYER ANSWER SUBMISSION TESTS
  // ============================================================================
  
  describe("submitPlayerAnswer", () => {
    it("should store option answer in session", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.submitPlayerAnswer("player-1", "B");
      
      expect(mockSetSession).toHaveBeenCalledWith(
        expect.objectContaining({
          playerAnswers: expect.objectContaining({ "player-1": "B" }),
        })
      );
    });

    it("should store text answer in session", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.submitPlayerAnswer("player-1", undefined, "My answer");
      
      expect(mockSetSession).toHaveBeenCalledWith(
        expect.objectContaining({
          playerAnswers: expect.objectContaining({ "player-1": "My answer" }),
        })
      );
    });

    it("should store numeric value answer in session", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.submitPlayerAnswer("player-1", undefined, undefined, 42);
      
      expect(mockSetSession).toHaveBeenCalledWith(
        expect.objectContaining({
          playerAnswers: expect.objectContaining({ "player-1": "42" }),
        })
      );
    });

    it("should publish answer.assign event", async () => {
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      freshSession.currentQuestionIndex = 0;
      mockGetSession.mockReturnValue(freshSession);

      // Reset singleton to get clean state
      (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
      const manager = QuizManager.getInstance();

      await manager.submitPlayerAnswer("player-1", "B", undefined, undefined);

      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "answer.assign",
        {
          question_id: "q-1",
          player_id: "player-1",
          option: "B",
          text: undefined,
          value: undefined,
        }
      );
    });
  });

  // ============================================================================
  // ZOOM CONTROL TESTS
  // ============================================================================
  
  describe("zoom controls", () => {
    it("zoomStart should call zoom controller start", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.zoomStart();
      
      expect(mockZoomStart).toHaveBeenCalled();
    });

    it("zoomStop should call zoom controller stop", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.zoomStop();
      
      expect(mockZoomStop).toHaveBeenCalled();
    });

    it("zoomResume should call zoom controller resume", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.zoomResume();
      
      expect(mockZoomResume).toHaveBeenCalled();
    });

    it("zoomStep should call zoom controller step with delta", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.zoomStep(5);
      
      expect(mockZoomStep).toHaveBeenCalledWith(5);
    });
  });

  // ============================================================================
  // MYSTERY IMAGE CONTROL TESTS
  // ============================================================================
  
  describe("mystery image controls", () => {
    it("mysteryStart should call mystery controller start", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.mysteryStart(100);
      
      expect(mockMysteryStart).toHaveBeenCalledWith(100);
    });

    it("mysteryStop should call mystery controller stop", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.mysteryStop();
      
      expect(mockMysteryStop).toHaveBeenCalled();
    });

    it("mysteryResume should call mystery controller resume", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.mysteryResume();
      
      expect(mockMysteryResume).toHaveBeenCalled();
    });

    it("mysteryStep should call mystery controller step", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.mysteryStep(5);
      
      expect(mockMysteryStep).toHaveBeenCalledWith(5);
    });

    it("getMysteryState should return mystery controller state", () => {
      mockMysteryGetState.mockReturnValue({ revealed: 50, total: 100, running: true });
      const manager = QuizManager.getInstance();
      
      const state = manager.getMysteryState();
      
      expect(state).toEqual({ revealed: 50, total: 100, running: true });
    });
  });

  // ============================================================================
  // BUZZER CONTROL TESTS
  // ============================================================================
  
  describe("buzzer controls", () => {
    it("buzzerHit should call buzzer service hit", () => {
      mockBuzzerHit.mockReturnValue({ accepted: true, winner: "player-1" });
      const manager = QuizManager.getInstance();
      
      const result = manager.buzzerHit("player-1");
      
      expect(mockBuzzerHit).toHaveBeenCalledWith("player-1");
      expect(result).toEqual({ accepted: true, winner: "player-1" });
    });

    it("buzzerLock should call buzzer service forceLock", () => {
      const manager = QuizManager.getInstance();
      
      manager.buzzerLock();
      
      expect(mockBuzzerForceLock).toHaveBeenCalled();
    });

    it("buzzerRelease should call buzzer service release", () => {
      const manager = QuizManager.getInstance();
      
      manager.buzzerRelease();
      
      expect(mockBuzzerRelease).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TIMER CONTROL TESTS
  // ============================================================================
  
  describe("timer controls", () => {
    it("timerAdd should add time to timer", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.timerAdd(10);
      
      expect(mockTimerAddTime).toHaveBeenCalledWith(10);
    });

    it("timerResume should resume timer with current phase", async () => {
      const manager = QuizManager.getInstance();
      await manager.showCurrentQuestion(); // Set phase to accept_answers
      
      await manager.timerResume();
      
      expect(mockTimerResume).toHaveBeenCalledWith("accept_answers");
    });

    it("timerStop should stop timer", async () => {
      const manager = QuizManager.getInstance();
      
      await manager.timerStop();
      
      expect(mockTimerStop).toHaveBeenCalled();
    });

    it("getTimerState should return timer state", () => {
      mockTimerGetSeconds.mockReturnValue(15);
      mockTimerIsRunning.mockReturnValue(true);
      mockTimerGetPhase.mockReturnValue("accept_answers");
      const manager = QuizManager.getInstance();
      
      const state = manager.getTimerState();
      
      expect(state).toEqual({
        seconds: 15,
        running: true,
        phase: "accept_answers",
      });
    });
  });

  // ============================================================================
  // SCORE MANAGEMENT TESTS
  // ============================================================================
  
  describe("score management", () => {
    describe("applyScoring (via reveal)", () => {
      it("should auto-score correct QCM answers", async () => {
        const sessionWithAnswer = JSON.parse(JSON.stringify({
          ...sampleSession,
          currentQuestionIndex: 0, // q-1 with 10 points
          playerAnswers: { "player-1": "B" }, // B is correct (index 1)
        }));
        mockGetSession.mockReturnValue(sessionWithAnswer);

        // Reset singleton to ensure clean state
        (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
        const manager = QuizManager.getInstance();

        await manager.reveal();

        expect(mockAddScorePlayer).toHaveBeenCalledWith("player-1", 10);
      });

      it("should not score incorrect QCM answers", async () => {
        const sessionWithWrongAnswer = JSON.parse(JSON.stringify({
          ...sampleSession,
          currentQuestionIndex: 0,
          playerAnswers: { "player-1": "A" }, // A is wrong
        }));
        mockGetSession.mockReturnValue(sessionWithWrongAnswer);

        (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
        const manager = QuizManager.getInstance();

        await manager.reveal();

        // Should be called with delta 0 for wrong answer
        expect(mockAddScorePlayer).toHaveBeenCalledWith("player-1", 0);
      });

      it("should publish score.update event for each player", async () => {
        const sessionWithAnswer = JSON.parse(JSON.stringify({
          ...sampleSession,
          currentQuestionIndex: 0,
          playerAnswers: { "player-1": "B" },
        }));
        mockGetSession.mockReturnValue(sessionWithAnswer);

        (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
        const manager = QuizManager.getInstance();

        await manager.reveal();

        expect(mockPublish).toHaveBeenCalledWith(
          OverlayChannel.QUIZ,
          "score.update",
          expect.objectContaining({
            user_id: "player-1",
            delta: 10,
            total: 10,
          })
        );
      });
    });

    describe("applyWinners", () => {
      it("should add points to selected players", async () => {
        // Use fresh session at question index 0 (q-1 with 10 points)
        const freshSession = JSON.parse(JSON.stringify(sampleSession));
        freshSession.currentQuestionIndex = 0;
        mockGetSession.mockReturnValue(freshSession);

        // Reset singleton to ensure clean state
        (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
        const manager = QuizManager.getInstance();

        await manager.applyWinners(["player-1", "player-2"]);

        // q-1 has 10 points
        expect(mockAddScorePlayer).toHaveBeenCalledWith("player-1", 10);
        expect(mockAddScorePlayer).toHaveBeenCalledWith("player-2", 10);
      });

      it("should use custom points when provided", async () => {
        const freshSession = JSON.parse(JSON.stringify(sampleSession));
        freshSession.currentQuestionIndex = 0;
        mockGetSession.mockReturnValue(freshSession);

        (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
        const manager = QuizManager.getInstance();

        await manager.applyWinners(["player-1"], { points: 25 });

        expect(mockAddScorePlayer).toHaveBeenCalledWith("player-1", 25);
      });

      it("should subtract points when remove option is true", async () => {
        // q-1 has 10 points, so removing should be -10
        const freshSession = JSON.parse(JSON.stringify(sampleSession));
        freshSession.currentQuestionIndex = 0;
        mockGetSession.mockReturnValue(freshSession);

        (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
        const manager = QuizManager.getInstance();

        await manager.applyWinners(["player-1"], { remove: true });

        expect(mockAddScorePlayer).toHaveBeenCalledWith("player-1", -10);
      });

      it("should publish score.update for each winner", async () => {
        mockAddScorePlayer.mockReturnValue(20);
        const freshSession = JSON.parse(JSON.stringify(sampleSession));
        freshSession.currentQuestionIndex = 0;
        mockGetSession.mockReturnValue(freshSession);

        (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
        const manager = QuizManager.getInstance();

        await manager.applyWinners(["player-1"]);

        // q-1 has 10 points
        expect(mockPublish).toHaveBeenCalledWith(
          OverlayChannel.QUIZ,
          "score.update",
          expect.objectContaining({
            user_id: "player-1",
            delta: 10,
            total: 20,
          })
        );
      });

      it("should update leaderboard after applying winners", async () => {
        const freshSession = JSON.parse(JSON.stringify(sampleSession));
        freshSession.currentQuestionIndex = 0;
        mockGetSession.mockReturnValue(freshSession);

        (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
        const manager = QuizManager.getInstance();

        await manager.applyWinners(["player-1"]);

        expect(mockPublish).toHaveBeenCalledWith(
          OverlayChannel.QUIZ,
          "leaderboard.push",
          expect.any(Object)
        );
      });
    });
  });

  // ============================================================================
  // SCORE PANEL TOGGLE TESTS
  // ============================================================================
  
  describe("toggleScorePanel", () => {
    it("should toggle scorePanelVisible from true to false", async () => {
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      freshSession.scorePanelVisible = true;
      mockGetSession.mockReturnValue(freshSession);
      const manager = QuizManager.getInstance();

      await manager.toggleScorePanel();

      expect(mockSetSession).toHaveBeenCalledWith(
        expect.objectContaining({ scorePanelVisible: false })
      );
    });

    it("should toggle scorePanelVisible from false to true", async () => {
      const sessionPanelHidden = JSON.parse(JSON.stringify({ ...sampleSession, scorePanelVisible: false }));
      mockGetSession.mockReturnValue(sessionPanelHidden);
      const manager = QuizManager.getInstance();

      await manager.toggleScorePanel();

      expect(mockSetSession).toHaveBeenCalledWith(
        expect.objectContaining({ scorePanelVisible: true })
      );
    });

    it("should publish scorepanel.toggle event", async () => {
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      freshSession.scorePanelVisible = true;
      mockGetSession.mockReturnValue(freshSession);
      const manager = QuizManager.getInstance();

      await manager.toggleScorePanel();

      expect(mockPublish).toHaveBeenCalledWith(
        OverlayChannel.QUIZ,
        "scorepanel.toggle",
        { visible: false }
      );
    });
  });

  // ============================================================================
  // PHASE MANAGEMENT TESTS
  // ============================================================================
  
  describe("getPhase", () => {
    it("should return current phase", () => {
      const manager = QuizManager.getInstance();
      
      expect(manager.getPhase()).toBe("idle");
    });
  });

  describe("phase transitions", () => {
    it("should follow show -> accept_answers -> lock -> reveal -> score_update flow", async () => {
      const manager = QuizManager.getInstance();
      
      expect(manager.getPhase()).toBe("idle");
      
      await manager.showCurrentQuestion();
      expect(manager.getPhase()).toBe("accept_answers");
      
      await manager.lockAnswers();
      expect(manager.getPhase()).toBe("lock");
      
      await manager.reveal();
      expect(manager.getPhase()).toBe("score_update");
    });

    it("should reset to idle on next/prev/select question", async () => {
      const freshSession = JSON.parse(JSON.stringify(sampleSession));
      freshSession.currentQuestionIndex = 0;
      mockGetSession.mockReturnValue(freshSession);

      // Reset singleton to ensure clean state
      (QuizManager as unknown as { instance: QuizManager | undefined }).instance = undefined;
      const manager = QuizManager.getInstance();

      await manager.showCurrentQuestion();
      expect(manager.getPhase()).toBe("accept_answers");

      await manager.nextQuestion();
      expect(manager.getPhase()).toBe("idle");
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  
  describe("error handling", () => {
    it("should throw when requireSession called with no session", async () => {
      mockGetSession.mockReturnValue(null);
      const manager = QuizManager.getInstance();
      
      await expect(manager.showCurrentQuestion()).rejects.toThrow("No active quiz session");
    });

    it("should throw when getCurrentQuestion called with invalid round index", async () => {
      const invalidSession = { ...sampleSession, currentRoundIndex: 999 };
      mockGetSession.mockReturnValue(invalidSession);
      const manager = QuizManager.getInstance();
      
      await expect(manager.showCurrentQuestion()).rejects.toThrow("No current round");
    });

    it("should throw when getCurrentQuestion called with invalid question index", async () => {
      const invalidSession = { ...sampleSession, currentQuestionIndex: 999 };
      mockGetSession.mockReturnValue(invalidSession);
      const manager = QuizManager.getInstance();
      
      await expect(manager.showCurrentQuestion()).rejects.toThrow("No current question");
    });
  });
});
