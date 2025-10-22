import { Question } from "../models/Quiz";

export class QuizScoringService {
  constructor(private readonly closestSlopeK: number) {}

  scoreQcm(isCorrect: boolean, points: number): number {
    return isCorrect ? points : 0;
  }

  scoreOpen(assigned: number, maxPoints: number): number {
    const clamped = Math.max(0, Math.min(assigned, maxPoints));
    return clamped;
  }

  scoreClosest(target: number, answer: number, maxPoints: number): number {
    const diff = Math.abs(target - answer);
    return Math.max(maxPoints - this.closestSlopeK * diff, 0);
  }

  isQcmCorrect(question: Question, optionIndex: number): boolean {
    if (typeof question.correct === "number") {
      return optionIndex === question.correct;
    }
    return false;
  }

  isClosestInRange(question: Question, value: number): boolean {
    if (typeof question.correct === "object" && question.correct && "min" in question.correct) {
      const range = question.correct as { min: number; max: number };
      return value >= range.min && value <= range.max;
    }
    return true;
  }
}


