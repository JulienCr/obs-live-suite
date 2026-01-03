"use client";
import { useEffect, useState } from "react";
import { QuizHostNavigator } from "@/components/quiz/host/QuizHostNavigator";
import { QuizHostTopBar } from "@/components/quiz/host/QuizHostTopBar";
import { QuizQuestionStage } from "@/components/quiz/host/QuizQuestionStage";
import { QuizPlayersPanel } from "@/components/quiz/host/QuizPlayersPanel";
import { SessionSelector } from "@/components/quiz/host/SessionSelector";
import { useQuizHostState } from "@/components/quiz/host/useQuizHostState";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils/websocket";

export default function QuizHostPage() {
  const { state, actions } = useQuizHostState();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ": // Space = Lock or Reveal
          e.preventDefault();
          if (state.phase === "accept_answers") {
            actions.lockAnswers();
          } else if (state.phase === "lock") {
            actions.revealAnswer();
          }
          break;
        case "ArrowLeft": // Prev question
          e.preventDefault();
          actions.prevQuestion();
          break;
        case "ArrowRight": // Next question
          e.preventDefault();
          actions.nextQuestion();
          break;
        case "t":
        case "T": // +10s timer
          e.preventDefault();
          actions.timerAdd(10);
          break;
        case "v":
        case "V": // Toggle viewer input
          e.preventDefault();
          actions.toggleViewerInput();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          // Quick points to player (future feature)
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.phase, actions]);

  const currentRound =
    state.session?.rounds[state.currentRoundIndex];
  const currentQuestion = currentRound?.questions[state.currentQuestionIndex];
  const canGoPrev = state.currentQuestionIndex > 0;
  const canGoNext =
    currentRound && state.currentQuestionIndex < currentRound.questions.length - 1;

  // Listen for score updates to show toasts
  useEffect(() => {
    // This will be triggered when scores update via WS
    // For now, just show toast when phase changes to score_update
    if (state.phase === "score_update") {
      state.players.forEach((player) => {
        // Show individual toasts for each player (in real impl, track delta)
        // This is simplified - real implementation would track previous scores
      });
    }
  }, [state.phase, state.players]);

  // Wrap actions with toast notifications
  const actionsWithToasts = {
    ...actions,
    lockAnswers: async () => {
      await actions.lockAnswers();
      toast.success("Answers locked", { duration: 2000 });
    },
    revealAnswer: async () => {
      await actions.revealAnswer();
      toast.success("Answer revealed • Scores applied", { duration: 3000 });
    },
    showQuestion: async () => {
      await actions.showQuestion();
      toast.info("Question shown", { duration: 2000 });
    },
  };

  // Show session selector if no session is loaded or session has no rounds
  if (!state.session || state.session.rounds.length === 0) {
    return (
      <div className="flex flex-col h-screen">
        <Toaster position="bottom-right" />
        <SessionSelector
          onLoadSession={(sessionId) => {
            actions.loadSession(sessionId);
            toast.success("Session loaded", { duration: 2000 });
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Toaster position="bottom-right" />
      <QuizHostTopBar
        onPrevQuestion={actions.prevQuestion}
        onShowQuestion={actionsWithToasts.showQuestion}
        onLockAnswers={actionsWithToasts.lockAnswers}
        onRevealAnswer={actionsWithToasts.revealAnswer}
        onNextQuestion={actions.nextQuestion}
        onToggleScorePanel={actions.toggleScorePanel}
        phase={state.phase}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        scorePanelVisible={state.scorePanelVisible}
      />

      <div className="flex flex-1 overflow-hidden">
        <QuizHostNavigator
          session={state.session}
          currentRoundIndex={state.currentRoundIndex}
          currentQuestionIndex={state.currentQuestionIndex}
          onSelectQuestion={actions.selectQuestion}
          onStartRound={actions.startRound}
          onEndRound={actions.endRound}
          onUnloadSession={actions.unloadSession}
        />

        <QuizQuestionStage
          question={currentQuestion || null}
          roundTitle={currentRound?.title || ""}
          questionNumber={state.currentQuestionIndex + 1}
          totalQuestions={currentRound?.questions.length || 0}
          phase={state.phase}
          timerSeconds={state.timerSeconds}
          timerRunning={state.timerRunning}
          players={state.players}
          onTimerStart={actions.timerStart}
          onTimerStop={actions.timerStop}
          onTimerAdd={actions.timerAdd}
          onLock={actionsWithToasts.lockAnswers}
          onReveal={actionsWithToasts.revealAnswer}
          onResetQuestion={actions.resetQuestion}
          onPlayerAssign={(playerId, option) => {
            actions.submitPlayerAnswer(playerId, option);
            const player = state.players.find(p => p.id === playerId);
            toast.success(`${player?.name || "Player"} assigned to ${option}`, { duration: 1500 });
          }}
          onWinnerSelect={(playerId, isWinner) => {
            actions.selectWinner(playerId, isWinner);
            const player = state.players.find(p => p.id === playerId);
            toast.success(`${player?.name || "Player"} ${isWinner ? 'selected as winner' : 'removed from winners'}`, { duration: 1500 });
          }}
          onZoomStart={() => {
            actions.zoomStart();
            toast.info("Zoom reveal started", { duration: 2000 });
          }}
          onZoomStop={() => {
            actions.zoomStop();
            toast.info("Zoom reveal paused", { duration: 1500 });
          }}
          onZoomResume={() => {
            actions.zoomResume();
            toast.info("Zoom reveal resumed", { duration: 1500 });
          }}
          onMysteryStart={(totalSquares) => {
            actions.mysteryStart(totalSquares);
            toast.info("Mystery reveal started", { duration: 2000 });
          }}
          onMysteryStop={() => {
            actions.mysteryStop();
            toast.info("Mystery reveal paused", { duration: 2000 });
          }}
          onMysteryResume={() => {
            actions.mysteryResume();
            toast.info("Mystery reveal resumed", { duration: 2000 });
          }}
          playerChoices={state.playerChoices}
          viewerVotes={state.viewerVotes}
          viewerPercentages={state.viewerPercentages}
          correctAnswer={currentQuestion?.correct}
          questionFinished={state.questionFinished}
          selectedPlayerId={selectedPlayerId}
          selectedWinners={state.selectedWinners}
        />

        <QuizPlayersPanel
          players={state.players}
          viewers={state.viewers}
          viewerInputEnabled={state.viewerInputEnabled}
          selectedPlayerId={selectedPlayerId}
          onToggleViewerInput={actions.toggleViewerInput}
          onPlayerSelect={setSelectedPlayerId}
          onScoreUpdate={async (playerId: string, newScore: number) => {
            try {
              const currentScore = state.players.find(p => p.id === playerId)?.score || 0;
              await fetch(`${getBackendUrl()}/api/quiz/score/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target: "player", id: playerId, delta: newScore - currentScore }),
              });
              // Don't reload session here - let the WebSocket handle updates
            } catch (error) {
              console.error("Failed to update score:", error);
              throw error; // Re-throw to let the component handle it
            }
          }}
          onScoreUpdateComplete={(updatedCount: number) => {
            if (updatedCount > 0) {
              toast.success(`Updated ${updatedCount} player score${updatedCount > 1 ? 's' : ''}`, { duration: 1500 });
            }
          }}
        />
      </div>
    </div>
  );
}
