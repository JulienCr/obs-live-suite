/**
 * Shared types for the Quiz system.
 * Extracted to avoid circular dependencies between QuizManager and its sub-managers.
 */

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
