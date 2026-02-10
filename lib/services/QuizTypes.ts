/**
 * Shared types and helpers for the Quiz system.
 * Extracted to avoid circular dependencies between QuizManager and its sub-managers.
 */

import type { QuizStore } from "./QuizStore";
import type { Session } from "../models/Quiz";

export type QuizPhase =
  | "idle"
  | "show_question"
  | "accept_answers"
  | "lock"
  | "reveal"
  | "score_update"
  | "interstitial";

/**
 * Error thrown when a quiz operation fails
 */
export class QuizError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "QuizError";
  }
}

/**
 * Require an active quiz session from the store, or throw.
 * Shared by QuizPhaseManager and QuizNavigationManager.
 */
export function requireSession(store: QuizStore): Session {
  const sess = store.getSession();
  if (!sess) throw new Error("No active quiz session");
  return sess;
}
