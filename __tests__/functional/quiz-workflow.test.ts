/**
 * Functional test for quiz workflow
 * Tests the full flow: start round → show question → lock → reveal → next
 */

import { QuizManager } from "../../lib/services/QuizManager";
import { QuizStore } from "../../lib/services/QuizStore";
import { createExampleSession } from "../../lib/services/QuizExamples";

describe("Quiz Workflow (Functional)", () => {
  let manager: QuizManager;
  let store: QuizStore;

  beforeEach(() => {
    manager = QuizManager.getInstance();
    store = QuizStore.getInstance();
    
    // Load example session
    const example = createExampleSession();
    const session = store.createDefaultSession();
    Object.assign(session, example);
    store.setSession(session);
  });

  it("should complete a full question cycle", async () => {
    // Start round
    await manager.startRound(0);
    expect(manager.getPhase()).toBe("idle");

    // Show question
    await manager.showCurrentQuestion();
    expect(manager.getPhase()).toBe("accept_answers");

    // Lock answers
    await manager.lockAnswers();
    expect(manager.getPhase()).toBe("lock");

    // Reveal
    await manager.reveal();
    expect(manager.getPhase()).toBe("score_update");

    // Move to next - phase resets to idle when advancing questions
    await manager.nextQuestion();
    expect(manager.getPhase()).toBe("idle");
  });

  it("should maintain session state across operations", async () => {
    const sessionBefore = store.getSession();
    expect(sessionBefore).toBeDefined();
    expect(sessionBefore?.rounds.length).toBeGreaterThan(0);

    await manager.startRound(0);
    await manager.showCurrentQuestion();

    const sessionAfter = store.getSession();
    expect(sessionAfter?.id).toBe(sessionBefore?.id);
    expect(sessionAfter?.currentRoundIndex).toBe(0);
  });

  it("should handle buzzer hits", () => {
    const result1 = manager.buzzerHit("player1");
    expect(result1.accepted).toBe(true);
    expect(result1.winner).toBe("player1");

    const result2 = manager.buzzerHit("player2");
    expect(result2.accepted).toBe(false);
    expect(result2.winner).toBe("player1");

    manager.buzzerRelease();
    const result3 = manager.buzzerHit("player2");
    expect(result3.accepted).toBe(true);
  });

  it("should manage zoom controller", async () => {
    await manager.zoomStart();
    // Zoom should be running
    await manager.zoomStep(1);
    await manager.zoomStop();
    // No errors expected
  });

  it("should track scores", () => {
    store.addScorePlayer("player1", 10);
    store.addScorePlayer("player1", 5);
    store.addScorePlayer("player2", 20);

    const leaderboard = store.getLeaderboardPlayers(10);
    expect(leaderboard.length).toBeGreaterThan(0);
    expect(leaderboard[0].score).toBeGreaterThanOrEqual(leaderboard[leaderboard.length - 1].score);
  });
});

