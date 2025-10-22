import { useState, useEffect, useCallback, useRef } from "react";
import { Session } from "@/lib/models/Quiz";

interface PlayerScore {
  id: string;
  name: string;
  avatar?: string;
  score: number;
}

interface ViewerScore {
  userId: string;
  displayName: string;
  score: number;
}

interface QuizHostState {
  session: Session | null;
  phase: string;
  currentRoundIndex: number;
  currentQuestionIndex: number;
  players: PlayerScore[];
  viewers: ViewerScore[];
  timerSeconds: number;
  timerRunning: boolean;
  viewerInputEnabled: boolean;
  scorePanelVisible: boolean;
  connected: boolean;
  playerChoices: Record<string, string>; // playerId -> option
  viewerVotes: Record<string, number>; // option -> count
  viewerPercentages: Record<string, number>; // option -> percentage
  questionFinished: boolean;
}

export function useQuizHostState() {
  const [state, setState] = useState<QuizHostState>({
    session: null,
    phase: "idle",
    currentRoundIndex: 0,
    currentQuestionIndex: 0,
    players: [],
    viewers: [],
    timerSeconds: 0,
    timerRunning: false,
    viewerInputEnabled: true,
    scorePanelVisible: true,
    connected: false,
    playerChoices: {},
    viewerVotes: {},
    viewerPercentages: {},
    questionFinished: false,
  });

  const ws = useRef<WebSocket | null>(null);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:3002/api/quiz/state");
      const data = await res.json();
      const session = data.session;
      const timer = data.timer;

      if (session) {
        const playersWithScores = (session.players || []).map((p: any) => ({
          id: p.id,
          name: p.displayName,
          avatar: p.avatarUrl,
          score: session.scores?.players?.[p.id] || 0,
        }));

        const viewersWithScores = Object.entries(
          session.scores?.viewers || {}
        ).map(([userId, score]) => ({
          userId,
          displayName: userId,
          score: score as number,
        }));

        setState((prev) => ({
          ...prev,
          session,
          phase: data.phase || "idle",
          currentRoundIndex: session.currentRoundIndex || 0,
          currentQuestionIndex: session.currentQuestionIndex || 0,
          players: playersWithScores,
          viewers: viewersWithScores,
          timerSeconds: timer?.seconds || 0,
          timerRunning: timer?.running || false,
          scorePanelVisible: session.scorePanelVisible !== undefined ? session.scorePanelVisible : true,
        }));
      }
    } catch (error) {
      console.error("Failed to load state:", error);
    }
  }, []);

  const connect = useCallback(() => {
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING)
    ) {
      try {
        ws.current.close();
      } catch {}
    }

    const url = `ws://${window.location.hostname}:3001`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setState((prev) => ({ ...prev, connected: true }));
      ws.current?.send(JSON.stringify({ type: "subscribe", channel: "quiz" }));
    };

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Send acknowledgment for all events (msg.data contains the actual event)
        if (msg.data?.id && ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(
            JSON.stringify({
              type: "ack",
              eventId: msg.data.id,
              success: true,
            })
          );
        }
        
        // Handle specific events for responsive updates
        const eventType = msg.data?.type;
        const payload = msg.data?.payload;
        
        if (eventType === "timer.tick" && payload) {
          setState((prev) => ({
            ...prev,
            timerSeconds: payload.s || 0,
            timerRunning: payload.s > 0,
            phase: payload.phase || prev.phase,
          }));
        } else if (eventType === "answer.assign" && payload) {
          // Player assigned to answer
          setState((prev) => ({
            ...prev,
            playerChoices: {
              ...prev.playerChoices,
              [payload.player_id]: payload.option || payload.text || payload.value?.toString() || "",
            },
          }));
        } else if (eventType === "vote.update" && payload) {
          // Viewer votes updated
          setState((prev) => ({
            ...prev,
            viewerVotes: payload.counts || {},
            viewerPercentages: payload.percentages || {},
          }));
        } else if (eventType === "phase.update" && payload) {
          // Phase changed
          setState((prev) => ({
            ...prev,
            phase: payload.phase || prev.phase,
          }));
        } else if (eventType === "score.update" && payload) {
          // Score updated - reload to get fresh scores
          loadState();
        } else if (eventType === "leaderboard.push" && payload) {
          // Leaderboard updated
          if (payload.topN && Array.isArray(payload.topN)) {
            setState((prev) => ({
              ...prev,
              viewers: payload.topN.map((v: any) => ({
                userId: v.id,
                displayName: v.name,
                score: v.score,
              })),
            }));
          }
        } else if (eventType === "question.finished") {
          // Question finished
          setState((prev) => ({ ...prev, questionFinished: true }));
        } else if (eventType === "question.show") {
          // New question shown - reset state
          setState((prev) => ({
            ...prev,
            playerChoices: {},
            viewerVotes: {},
            viewerPercentages: {},
            questionFinished: false,
          }));
          loadState();
        } else if (eventType === "question.change" && payload?.clear_assignments) {
          // Question changed (nav prev/next/select) - clear assignments
          setState((prev) => ({
            ...prev,
            playerChoices: {},
            viewerVotes: {},
            viewerPercentages: {},
            questionFinished: false,
          }));
        } else if (eventType === "scorepanel.toggle" && payload) {
          // Score panel visibility toggled
          setState((prev) => ({
            ...prev,
            scorePanelVisible: payload.visible !== undefined ? payload.visible : !prev.scorePanelVisible,
          }));
        } else {
          // For other events, reload full state
          loadState();
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.current.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };
  }, [loadState]);

  useEffect(() => {
    loadState();
    connect();
    return () => {
      try {
        ws.current?.close();
      } catch {}
    };
  }, [connect, loadState]);

  const call = async (path: string, body?: any) => {
    try {
      await fetch("http://localhost:3002/api/quiz" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      setTimeout(loadState, 100);
    } catch (error) {
      console.error("API call failed:", error);
    }
  };

  return {
    state,
    actions: {
      startRound: (roundIndex: number) => call("/round/start", { roundIndex }),
      endRound: () => call("/round/end"),
      showQuestion: () => call("/question/show"),
      lockAnswers: () => call("/question/lock"),
      revealAnswer: () => call("/question/reveal"),
      nextQuestion: () => call("/question/next"),
      prevQuestion: () => call("/question/prev"),
      timerStart: () => call("/timer/resume"),
      timerStop: () => call("/timer/stop"),
      timerAdd: (delta: number) => call("/timer/add", { delta }),
      resetQuestion: () => call("/question/reset"),
      toggleViewerInput: () => {
        setState((prev) => ({
          ...prev,
          viewerInputEnabled: !prev.viewerInputEnabled,
        }));
        call("/viewer-input/toggle");
      },
      toggleScorePanel: async () => {
        try {
          await fetch("http://localhost:3002/api/quiz/scorepanel/toggle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Failed to toggle score panel:", error);
        }
      },
      selectQuestion: async (questionId: string) => {
        try {
          await fetch("http://localhost:3002/api/quiz/question/select", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionId }),
          });
          setTimeout(loadState, 50);
        } catch (error) {
          console.error("Failed to select question:", error);
        }
      },
      submitPlayerAnswer: async (playerId: string, option?: string, text?: string, value?: number) => {
        try {
          await fetch("http://localhost:3002/api/quiz/player/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId, option, text, value }),
          });
        } catch (error) {
          console.error("Failed to submit answer:", error);
        }
      },
      loadSession: async (sessionId: string) => {
        try {
          await fetch("http://localhost:3002/api/quiz/session/load", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: sessionId }),
          });
          setTimeout(loadState, 100);
        } catch (error) {
          console.error("Failed to load session:", error);
        }
      },
      unloadSession: async () => {
        try {
          await fetch("http://localhost:3002/api/quiz/session/reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          setTimeout(loadState, 100);
        } catch (error) {
          console.error("Failed to unload session:", error);
        }
      },
    },
  };
}

