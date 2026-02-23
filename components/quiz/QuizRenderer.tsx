"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { QuizQcmDisplay } from "./QuizQcmDisplay";
import { QuizTimerDisplay } from "./QuizTimerDisplay";
import { QuizScorePanel } from "./QuizScorePanel";
import { QuizZoomReveal } from "./QuizZoomReveal";
import { QuizOpenDisplay } from "./QuizOpenDisplay";
import { QuizMysteryImage } from "./QuizMysteryImage";
import { getBackendUrl } from "@/lib/utils/websocket";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import type { QuizEventType } from "@/lib/models/QuizEvents";

interface QuizState {
  phase: string;
  questionId?: string;
  questionType?: string;
  questionMode?: string;
  timerSeconds?: number;
  voteCounts?: Record<string, number>;
  votePercentages?: Record<string, number>;
  players?: Array<{ id: string; name: string; avatar?: string; score?: number }>;
  currentQuestion?: {
    text: string;
    type: string;
    mode?: string;
    options?: string[];
    optionsAreImages?: boolean;
    media?: string;
    correct?: number;
    time_s?: number;
  };
  playerAssignments?: Record<string, string>; // playerId -> option
  scorePanelVisible?: boolean;
  zoomLevel?: number;
  zoomSteps?: number;
  zoomMaxZoom?: number;
  mysteryRevealedSquares?: number;
  mysteryTotalSquares?: number;
  buzzerWinner?: { name: string; avatar?: string };
  topAnswers?: Array<{ userId: string; displayName: string; text: string }>;
  winner?: { name: string; avatar?: string };
}

/**
 * WebSocket event data structure for quiz events
 */
interface QuizEventData {
  id?: string;
  type: QuizEventType | string;
  payload?: QuizEventPayload;
}

/**
 * Union of all possible quiz event payloads
 */
interface QuizEventPayload {
  // question.show
  question_id?: string;
  zoom_steps?: number;
  zoom_maxZoom?: number;
  // vote.update
  counts?: Record<string, number>;
  percentages?: Record<string, number>;
  // timer.tick
  s?: number;
  phase?: string;
  // zoom.step
  cur_step?: number;
  total?: number;
  maxZoom?: number;
  // zoom.start
  steps?: number;
  // mystery.step / mystery.start
  revealed_squares?: number;
  total_squares?: number;
  // buzzer.hit
  player?: { name: string; avatar?: string };
  // answer.assign
  player_id?: string;
  option?: string;
  // scorepanel.toggle
  visible?: boolean;
  // score.update
  user_id?: string;
  delta?: number;
  // Used by both zoom.complete and score.update (total score)
  // Note: 'total' already defined above for zoom.step
}

export function QuizRenderer() {
  const [state, setState] = useState<QuizState>({
    phase: "idle",
    scorePanelVisible: true, // Default to visible
  });

  // Ref to hold sendAck function for use in handleMessage callback
  const sendAckRef = useRef<(eventId: string) => void>(() => {});
  const questionShowTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const questionShowAbortRef = useRef<AbortController | null>(null);

  const handleMessage = useCallback(async (data: QuizEventData) => {
    // Send acknowledgment if event has an ID
    if (data.id) {
      sendAckRef.current(data.id);
    }

    const { type, payload } = data;
    switch (type) {
      case "quiz.start_round":
        setState((prev) => ({ ...prev, phase: "show_question" }));
        break;
      case "question.show":
        // Cancel any pending question.show transition/fetch
        if (questionShowTimeoutRef.current) {
          clearTimeout(questionShowTimeoutRef.current);
        }
        if (questionShowAbortRef.current) {
          questionShowAbortRef.current.abort();
        }

        // First, hide current question and reset
        setState((prev) => ({
          ...prev,
          phase: "hiding",
          voteCounts: {},
          votePercentages: {},
          playerAssignments: {},
        }));

        // Wait for transition, then show new question
        questionShowTimeoutRef.current = setTimeout(async () => {
          if (payload?.question_id) {
            const abortController = new AbortController();
            questionShowAbortRef.current = abortController;
            try {
              const res = await fetch(`${getBackendUrl()}/api/quiz/state`, {
                signal: abortController.signal,
              });
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
                  questionMode: currentQ.mode,
                  currentQuestion: {
                    text: currentQ.text,
                    type: currentQ.type,
                    mode: currentQ.mode,
                    options: currentQ.options,
                    // Options are images only if all options are URLs
                    optionsAreImages: currentQ.options?.every((o: string) => typeof o === 'string' && o.startsWith("http")),
                    media: currentQ.media, // Question image URL (separate from options)
                    correct: currentQ.correct,
                    time_s: currentQ.time_s,
                  },
                  players: playersWithScores,
                  scorePanelVisible: stateData.session?.scorePanelVisible !== undefined ? stateData.session.scorePanelVisible : prev.scorePanelVisible,
                  // Reset mystery state for new question
                  mysteryRevealedSquares: 0,
                  mysteryTotalSquares: 0,
                  // Initialize zoom config from question.show payload
                  zoomLevel: 0,
                  zoomSteps: payload?.zoom_steps || 180,
                  zoomMaxZoom: payload?.zoom_maxZoom || 26,
                }));
              }
            } catch (error) {
              if ((error as Error).name !== "AbortError") {
                console.error("Failed to fetch question:", error);
              }
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
        setState((prev) => ({ 
          ...prev, 
          zoomLevel: payload?.cur_step || 0,
          zoomSteps: payload?.total || prev.zoomSteps,
          zoomMaxZoom: payload?.maxZoom || prev.zoomMaxZoom
        }));
        break;
      case "zoom.start":
        setState((prev) => ({
          ...prev,
          zoomLevel: 0,
          zoomSteps: payload?.steps || 600,
          zoomMaxZoom: payload?.maxZoom || 35
        }));
        break;
      case "zoom.complete":
        // On reveal, set zoom to fully revealed (scale = 1x)
        setState((prev) => ({
          ...prev,
          zoomLevel: payload?.total || prev.zoomSteps || 600,
        }));
        break;
      case "mystery.step":
        setState((prev) => ({ 
          ...prev, 
          mysteryRevealedSquares: payload?.revealed_squares || 0,
          mysteryTotalSquares: payload?.total_squares || 0,
        }));
        break;
      case "mystery.start":
        setState((prev) => ({ 
          ...prev, 
          mysteryRevealedSquares: 0,
          mysteryTotalSquares: payload?.total_squares || 0,
        }));
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
          const playerId = payload.player_id;
          const optionValue = payload.option;
          setState((prev) => ({
            ...prev,
            playerAssignments: {
              ...prev.playerAssignments,
              [playerId]: optionValue,
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

  // Cleanup pending question.show timeout/fetch on unmount
  useEffect(() => {
    return () => {
      if (questionShowTimeoutRef.current) {
        clearTimeout(questionShowTimeoutRef.current);
      }
      if (questionShowAbortRef.current) {
        questionShowAbortRef.current.abort();
      }
    };
  }, []);

  // Initial state fetch on mount
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/quiz/state`);
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

  // Connect to WebSocket and subscribe to quiz channel
  const { sendAck } = useWebSocketChannel<QuizEventData>(
    "quiz",
    handleMessage,
    { logPrefix: "QuizRenderer" }
  );

  // Keep sendAck ref up to date for use in handleMessage callback
  sendAckRef.current = sendAck;

  // Determine which display to show based on question mode and type
  const renderDisplay = () => {
    const qType = state.currentQuestion?.type || state.questionType;
    const qMode = state.currentQuestion?.mode || state.questionMode;
    
    // Mystery image mode - progressive square reveal
    if (qMode === "mystery_image") {
      return (
        <QuizMysteryImage
          imageUrl={state.currentQuestion?.media || undefined}
          questionText={state.currentQuestion?.text}
          phase={state.phase}
          revealedSquares={state.mysteryRevealedSquares}
          totalSquares={state.mysteryTotalSquares}
          buzzerWinner={state.buzzerWinner}
        />
      );
    }
    
    // Zoom reveal mode
    if (qMode === "image_zoombuzz" || (qType === "closest" && state.currentQuestion?.media)) {
      return (
        <QuizZoomReveal
          imageUrl={state.currentQuestion?.media}
          questionText={state.currentQuestion?.text}
          zoomLevel={state.zoomLevel}
          zoomSteps={state.zoomSteps}
          zoomMaxZoom={state.zoomMaxZoom}
          phase={state.phase}
          buzzerWinner={state.buzzerWinner}
        />
      );
    }
    
    // Open question mode
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
        question={state.currentQuestion ? {
          ...state.currentQuestion,
          type: state.currentQuestion.type as "closest" | "qcm" | "text" | undefined
        } : undefined}
        playerAssignments={state.playerAssignments}
        players={state.players}
      />
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ width: "1920px", height: "1080px", maxWidth: "100vw", maxHeight: "100vh" }}>
      <QuizTimerDisplay seconds={state.timerSeconds} phase={state.phase} timeLimit={state.currentQuestion?.time_s} />
      {renderDisplay()}
      <QuizScorePanel players={state.players} visible={state.scorePanelVisible} />
    </div>
  );
}

