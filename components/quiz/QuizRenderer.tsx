"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { QuizQcmDisplay } from "./QuizQcmDisplay";
import { QuizTimerDisplay } from "./QuizTimerDisplay";
import { QuizScorePanel } from "./QuizScorePanel";
import { QuizZoomReveal } from "./QuizZoomReveal";
import { QuizOpenDisplay } from "./QuizOpenDisplay";

interface QuizState {
  phase: string;
  questionId?: string;
  questionType?: string;
  timerSeconds?: number;
  voteCounts?: Record<string, number>;
  votePercentages?: Record<string, number>;
  players?: Array<{ id: string; name: string; avatar?: string; score?: number }>;
  currentQuestion?: {
    text: string;
    type: string;
    options?: string[];
    optionsAreImages?: boolean;
    media?: string;
    correct?: number;
  };
  playerAssignments?: Record<string, string>; // playerId -> option
  scorePanelVisible?: boolean;
  zoomLevel?: number;
  buzzerWinner?: { name: string; avatar?: string };
  topAnswers?: Array<{ userId: string; displayName: string; text: string }>;
  winner?: { name: string; avatar?: string };
}

export function QuizRenderer() {
  const ws = useRef<WebSocket | null>(null);
  const [state, setState] = useState<QuizState>({ 
    phase: "idle",
    scorePanelVisible: true, // Default to visible
  });

  const handleEvent = useCallback(async (data: any) => {
    const { type, payload } = data;
    switch (type) {
      case "quiz.start_round":
        setState((prev) => ({ ...prev, phase: "show_question" }));
        break;
      case "question.show":
        // First, hide current question and reset
        setState((prev) => ({ 
          ...prev, 
          phase: "hiding",
          voteCounts: {}, 
          votePercentages: {}, 
          playerAssignments: {},
        }));
        
        // Wait for transition, then show new question
        setTimeout(async () => {
          if (payload?.question_id) {
            try {
              const res = await fetch("http://localhost:3002/api/quiz/state");
              const stateData = await res.json();
              const currentQ = stateData.session?.rounds?.[stateData.session?.currentRoundIndex]?.questions?.[stateData.session?.currentQuestionIndex];
              if (currentQ) {
                // Map players with their scores
                const playersWithScores = (stateData.session?.players || []).map((p: any) => ({
                  id: p.id,
                  name: p.displayName || p.name,
                  avatar: p.avatarUrl || p.avatar,
                  score: stateData.session?.scores?.players?.[p.id] || 0,
                }));

                setState((prev) => ({
                  ...prev,
                  phase: "accept_answers",
                  questionId: payload?.question_id,
                  questionType: currentQ.type,
                  currentQuestion: {
                    text: currentQ.text,
                    type: currentQ.type,
                    options: currentQ.options,
                    // Options are images only if all options are URLs
                    optionsAreImages: currentQ.options?.every((o: string) => typeof o === 'string' && o.startsWith("http")),
                    media: currentQ.media, // Question image URL (separate from options)
                    correct: currentQ.correct,
                  },
                  players: playersWithScores,
                  scorePanelVisible: stateData.session?.scorePanelVisible !== undefined ? stateData.session.scorePanelVisible : prev.scorePanelVisible,
                }));
              }
            } catch (error) {
              console.error("Failed to fetch question:", error);
            }
          }
        }, 400); // 400ms transition delay
        break;
      case "question.lock":
        setState((prev) => ({ ...prev, phase: "lock" }));
        break;
      case "question.reveal":
        setState((prev) => ({ ...prev, phase: "reveal" }));
        break;
      case "vote.update":
        setState((prev) => ({ ...prev, voteCounts: payload?.counts, votePercentages: payload?.percentages }));
        break;
      case "timer.tick":
        setState((prev) => ({ ...prev, timerSeconds: payload?.s, phase: payload?.phase || prev.phase }));
        break;
      case "zoom.step":
        setState((prev) => ({ ...prev, zoomLevel: payload?.cur_step || 0 }));
        break;
      case "buzzer.hit":
        setState((prev) => ({ ...prev, buzzerWinner: payload?.player }));
        break;
      case "buzzer.release":
        setState((prev) => ({ ...prev, buzzerWinner: undefined }));
        break;
      case "answer.assign":
        // Update player assignments
        if (payload?.player_id && payload?.option) {
          setState((prev) => ({
            ...prev,
            playerAssignments: {
              ...prev.playerAssignments,
              [payload.player_id]: payload.option,
            },
          }));
        }
        break;
      case "question.change":
        // Question changed (nav) - hide question and clear assignments
        setState((prev) => ({
          ...prev,
          phase: "idle", // Hide the question
          playerAssignments: {},
          voteCounts: {},
          votePercentages: {},
          currentQuestion: undefined, // Clear question data
        }));
        break;
      case "scorepanel.toggle":
        setState((prev) => ({
          ...prev,
          scorePanelVisible: payload?.visible !== undefined ? payload.visible : !prev.scorePanelVisible,
        }));
        break;
      case "score.update":
        // Refresh player scores when they change
        if (payload?.user_id && payload?.total !== undefined) {
          setState((prev) => ({
            ...prev,
            players: prev.players?.map(p => 
              p.id === payload.user_id ? { ...p, score: payload.total } : p
            ),
          }));
        }
        break;
      default:
        break;
    }
  }, []);

  // Initial state fetch on mount
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const res = await fetch("http://localhost:3002/api/quiz/state");
        const stateData = await res.json();
        
        if (stateData.session) {
          // Map players with their scores
          const playersWithScores = (stateData.session.players || []).map((p: any) => ({
            id: p.id,
            name: p.displayName || p.name,
            avatar: p.avatarUrl || p.avatar,
            score: stateData.session.scores?.players?.[p.id] || 0,
          }));

          setState((prev) => ({
            ...prev,
            players: playersWithScores,
            scorePanelVisible: stateData.session.scorePanelVisible !== undefined ? stateData.session.scorePanelVisible : true,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
      }
    };
    
    fetchInitialState();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const connect = () => {
      if (!isMounted) return;
      if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
        try { ws.current.close(); } catch {}
      }
      const url = `ws://${window.location.hostname}:3001`;
      ws.current = new WebSocket(url);
      ws.current.onopen = () => {
        if (!isMounted) return;
        ws.current?.send(JSON.stringify({ type: "subscribe", channel: "quiz" }));
      };
      ws.current.onmessage = (e) => {
        if (!isMounted) return;
        try {
          const msg = JSON.parse(e.data);
          
          // Send acknowledgment if event has an ID (msg.data contains the actual event)
          if (msg.data?.id && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(
              JSON.stringify({
                type: "ack",
                eventId: msg.data.id,
                success: true,
              })
            );
          }
          
          if (msg.channel === "quiz") handleEvent(msg.data);
        } catch (error) {
          console.error("QuizRenderer: Failed to handle message", error);
        }
      };
      ws.current.onclose = () => {
        if (isMounted) setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      isMounted = false;
      try { ws.current?.close(); } catch {}
    };
  }, [handleEvent]);

  // Determine which display to show based on question type
  const renderDisplay = () => {
    const qType = state.currentQuestion?.type || state.questionType;
    
    if (qType === "image_zoombuzz" || (qType === "closest" && state.currentQuestion?.media)) {
      return (
        <QuizZoomReveal
          imageUrl={state.currentQuestion?.media}
          questionText={state.currentQuestion?.text}
          zoomLevel={state.zoomLevel}
          phase={state.phase}
          buzzerWinner={state.buzzerWinner}
        />
      );
    }
    
    if (qType === "open") {
      return (
        <QuizOpenDisplay
          questionText={state.currentQuestion?.text}
          phase={state.phase}
          topAnswers={state.topAnswers}
          winner={state.winner}
        />
      );
    }
    
    // Default: QCM or Image QCM
    return (
      <QuizQcmDisplay
        voteCounts={state.voteCounts}
        votePercentages={state.votePercentages}
        phase={state.phase}
        question={state.currentQuestion}
        playerAssignments={state.playerAssignments}
        players={state.players}
      />
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ width: "1920px", height: "1080px", maxWidth: "100vw", maxHeight: "100vh" }}>
      <QuizTimerDisplay seconds={state.timerSeconds} phase={state.phase} />
      {renderDisplay()}
      <QuizScorePanel players={state.players} visible={state.scorePanelVisible} />
    </div>
  );
}

