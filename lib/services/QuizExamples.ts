import { Question, Round, Session } from "../models/Quiz";
import { randomUUID } from "crypto";

export function createExampleQuestions(): Question[] {
  return [
    {
      id: randomUUID(),
      type: "qcm",
      text: "What is the capital of France?",
      media: null,
      options: ["London", "Paris", "Berlin", "Madrid"],
      correct: 1,
      points: 10,
      tie_break: false,
      time_s: 20,
    },
    {
      id: randomUUID(),
      type: "image",
      mode: "image_qcm",
      text: "What animal is shown?",
      media: "https://fpoimg.com/600x400?bg_color=4A90E2&text_color=FFFFFF&text=Animal+Quiz",
      options: ["Cat", "Dog", "Bird", "Fish"],
      correct: 1,
      points: 15,
      tie_break: false,
      time_s: 25,
    },
    {
      id: randomUUID(),
      type: "closest",
      text: "How many countries are in the European Union?",
      media: null,
      correct: 27,
      points: 20,
      tie_break: false,
      time_s: 30,
    },
    {
      id: randomUUID(),
      type: "open",
      text: "Name a programming language",
      media: null,
      points: 10,
      tie_break: false,
      time_s: 30,
    },
    {
      id: randomUUID(),
      type: "image",
      mode: "image_zoombuzz",
      text: "Identify this landmark",
      media: "https://fpoimg.com/800x600?bg_color=E74C3C&text_color=FFFFFF&text=Mystery+Landmark",
      correct: "Eiffel Tower",
      points: 25,
      tie_break: false,
      time_s: 45,
      zoom: {
        auto: true,
        interval_ms: 300,
        steps: 20,
        cur_step: 0,
        effect: "scale",
      },
      buzz: {
        timeout_ms: 8000,
        lock_ms: 300,
        steal: false,
        steal_window_ms: 4000,
      },
    },
  ];
}

export function createExampleRound(): Round {
  return {
    id: randomUUID(),
    title: "Sample Round",
    questions: createExampleQuestions(),
  };
}

export function createExampleSession(): Partial<Session> {
  return {
    id: randomUUID(),
    title: "Example Quiz Session",
    rounds: [createExampleRound()],
    currentRoundIndex: 0,
    currentQuestionIndex: 0,
  };
}

