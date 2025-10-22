"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, Lock, CheckCircle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onPrevQuestion: () => void;
  onShowQuestion: () => void;
  onLockAnswers: () => void;
  onRevealAnswer: () => void;
  onNextQuestion: () => void;
  onToggleScorePanel: () => void;
  phase: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  scorePanelVisible?: boolean;
}

export function QuizHostTopBar({
  onPrevQuestion,
  onShowQuestion,
  onLockAnswers,
  onRevealAnswer,
  onNextQuestion,
  onToggleScorePanel,
  phase,
  canGoPrev,
  canGoNext,
  scorePanelVisible = true,
}: TopBarProps) {
  return (
    <div className="border-b bg-white px-4 py-3 flex items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        onClick={onPrevQuestion}
        disabled={!canGoPrev}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Prev Question
      </Button>

      <div className="h-6 w-px bg-gray-300" />

      <Button
        size="sm"
        variant="default"
        onClick={onShowQuestion}
        disabled={phase === "accept_answers" || phase === "lock" || phase === "reveal"}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
      >
        <Eye className="w-4 h-4 mr-1" />
        Show Question
      </Button>

      <Button
        size="sm"
        variant="default"
        onClick={onLockAnswers}
        disabled={phase !== "accept_answers"}
        className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
      >
        <Lock className="w-4 h-4 mr-1" />
        Lock Answers
      </Button>

      <Button
        size="sm"
        variant="default"
        onClick={onRevealAnswer}
        disabled={phase !== "lock" && phase !== "accept_answers"}
        className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
        title={phase === "accept_answers" ? "Lock first or force reveal" : ""}
      >
        <CheckCircle className="w-4 h-4 mr-1" />
        Reveal Answer
      </Button>

      <div className="h-6 w-px bg-gray-300" />

      <Button
        size="sm"
        variant="outline"
        onClick={onNextQuestion}
        disabled={!canGoNext}
      >
        Next Question
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>

      <div className="h-6 w-px bg-gray-300" />

      <Button
        size="sm"
        variant={scorePanelVisible ? "default" : "outline"}
        onClick={onToggleScorePanel}
        title={scorePanelVisible ? "Hide score panel" : "Show score panel"}
      >
        <BarChart3 className="w-4 h-4 mr-1" />
        {scorePanelVisible ? "Hide Scores" : "Show Scores"}
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-gray-600">Phase:</span>
        <span
          className={cn(
            "px-2 py-1 text-xs font-semibold rounded",
            phase === "idle" && "bg-gray-100 text-gray-700",
            phase === "accept_answers" && "bg-green-100 text-green-700",
            phase === "lock" && "bg-yellow-100 text-yellow-700",
            phase === "reveal" && "bg-blue-100 text-blue-700",
            phase === "score_update" && "bg-purple-100 text-purple-700"
          )}
        >
          {phase === "idle" && "Idle"}
          {phase === "show_question" && "Showing"}
          {phase === "accept_answers" && "Accepting"}
          {phase === "lock" && "Locked"}
          {phase === "reveal" && "Revealed"}
          {phase === "score_update" && "Scoring"}
          {phase === "interstitial" && "Interstitial"}
        </span>
      </div>
    </div>
  );
}

