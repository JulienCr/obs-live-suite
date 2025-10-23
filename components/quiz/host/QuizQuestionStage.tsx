"use client";

import { Question, Player } from "@/lib/models/Quiz";
import { Button } from "@/components/ui/button";
import { Clock, Play, Pause, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerAvatarChip } from "./PlayerAvatarChip";
import { useState } from "react";
import * as React from "react";

interface PlayerScore {
  id: string;
  name: string;
  avatar?: string;
  score: number;
}

interface QuestionStageProps {
  question: Question | null;
  roundTitle: string;
  questionNumber: number;
  totalQuestions: number;
  phase: string;
  timerSeconds: number;
  timerRunning: boolean;
  players: PlayerScore[];
  selectedPlayerId?: string | null;
  onTimerStart: () => void;
  onTimerStop: () => void;
  onTimerAdd: (seconds: number) => void;
  onLock: () => void;
  onReveal: () => void;
  onResetQuestion: () => void;
  onPlayerAssign: (playerId: string, option: string) => void;
  onWinnerSelect: (playerId: string, isWinner: boolean) => void; // New: for closest/open questions
  onZoomStart?: () => void; // New: zoom controls
  onZoomStop?: () => void;
  onZoomResume?: () => void;
  onMysteryStart?: (totalSquares: number) => void; // New: mystery image controls
  onMysteryStop?: () => void;
  onMysteryResume?: () => void;
  playerChoices: Record<string, string>; // playerId -> option
  viewerVotes: Record<string, number>; // option -> count
  viewerPercentages: Record<string, number>; // option -> percentage
  correctAnswer?: number | string; // The correct answer for this question
  questionFinished: boolean;
  selectedWinners?: string[]; // New: array of winner player IDs
}

export function QuizQuestionStage({
  question,
  roundTitle,
  questionNumber,
  totalQuestions,
  phase,
  timerSeconds,
  timerRunning,
  players,
  selectedPlayerId,
  onTimerStart,
  onTimerStop,
  onTimerAdd,
  onLock,
  onReveal,
  onResetQuestion,
  onPlayerAssign,
  onWinnerSelect,
  onZoomStart,
  onZoomStop,
  onZoomResume,
  onMysteryStart,
  onMysteryStop,
  onMysteryResume,
  playerChoices,
  viewerVotes,
  viewerPercentages,
  correctAnswer,
  questionFinished,
  selectedWinners = [],
}: QuestionStageProps) {
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [zoomRunning, setZoomRunning] = useState(false);
  const [zoomStarted, setZoomStarted] = useState(false);
  const [mysteryRunning, setMysteryRunning] = useState(false);
  const [mysteryStarted, setMysteryStarted] = useState(false); // Track if ever started
  const [mysteryTotalSquares, setMysteryTotalSquares] = useState<number>(0);
  
  if (!question) {
    return (
      <main className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-400">No question loaded</p>
      </main>
    );
  }

  const totalVotes = Object.values(viewerVotes).reduce((a, b) => a + b, 0);
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isQcmMode =
    question.type === "qcm" ||
    (question.type === "image" && question.options && question.options.length > 0);
  
  const isZoomMode = question.type === "image" && question.mode === "image_zoombuzz";
  const isMysteryImageMode = question.type === "image" && question.mode === "mystery_image";
  
  // Calculate grid size for mystery image when image loads
  // Hook called unconditionally, with conditional logic inside
  React.useEffect(() => {
    // Reset state when question changes
    setZoomRunning(false);
    setZoomStarted(false);
    setMysteryRunning(false);
    setMysteryStarted(false);
    
    if (isMysteryImageMode && question.media) {
      const img = new Image();
      img.onload = () => {
        const squareSize = 20;
        const cols = Math.ceil(img.naturalWidth / squareSize);
        const rows = Math.ceil(img.naturalHeight / squareSize);
        const total = cols * rows;
        setMysteryTotalSquares(total);
        console.log(`Mystery image grid calculated: ${cols}x${rows} = ${total} squares`);
      };
      img.onerror = () => {
        console.error("Failed to load mystery image for grid calculation");
        setMysteryTotalSquares(0);
      };
      img.src = question.media;
    } else {
      setMysteryTotalSquares(0);
    }
  }, [isMysteryImageMode, question.media]);

  return (
    <main className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">{roundTitle}</h2>
            <span className="text-sm text-gray-500">
              Question {questionNumber}/{totalQuestions}
            </span>
          </div>
          <span
            className={cn(
              "px-3 py-1 text-sm rounded-full font-medium",
              phase === "idle" && "bg-gray-100 text-gray-700 border-2 border-gray-300",
              phase === "accept_answers" && "bg-green-100 text-green-700",
              phase === "lock" && "bg-yellow-100 text-yellow-700",
              phase === "reveal" && "bg-blue-100 text-blue-700"
            )}
          >
            {phase === "idle" && "⏸ Ready (Not Shown)"}
            {phase === "accept_answers" && "✓ Live & Accepting"}
            {phase === "lock" && "🔒 Locked"}
            {phase === "reveal" && "👁 Revealed"}
          </span>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 p-6">
        {/* Idle State Banner */}
        {phase === "idle" && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <span className="text-lg">ℹ️</span>
              <p className="font-medium">
                This question is loaded but <strong>not visible</strong> to viewers yet.
                Click <strong>&ldquo;Show Question&rdquo;</strong> in the top bar to display it.
              </p>
            </div>
          </div>
        )}
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-2">{question.text}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Type: {question.type}</span>
              <span>Points: {question.points}</span>
            </div>
          </div>

          {question.media && (
            <div className="mb-6">
              <img
                src={question.media}
                alt="Question media"
                className="max-w-md rounded-lg shadow"
              />
            </div>
          )}

          {/* Explanation - show when locked or revealed */}
          {(phase === "lock" || phase === "reveal" || phase === "score_update") && question.explanation && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div>
                  <div className="font-semibold text-blue-800 mb-2">Explication :</div>
                  <div className="text-blue-700">{question.explanation}</div>
                </div>
              </div>
            </div>
          )}

          {/* QCM Options */}
          {isQcmMode && question.options && (
            <div className="space-y-3">
              {question.options.map((opt, idx) => {
                const optionKey = String.fromCharCode(65 + idx); // A, B, C, D
                const voteCount = viewerVotes[optionKey] || 0;
                const percentage = viewerPercentages[optionKey] || 0;

                // Find players assigned to this option
                const assignedPlayers = players.filter(
                  (p) => playerChoices[p.id] === optionKey
                );
                
                const isCorrect = idx === question.correct;
                const isRevealed = phase === "reveal";
                const isLocked = phase === "lock";

                const handleDragOver = (e: React.DragEvent) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                };

                const handleDrop = (e: React.DragEvent) => {
                  e.preventDefault();
                  const playerId = e.dataTransfer.getData("text/plain");
                  if (playerId) {
                    onPlayerAssign(playerId, optionKey);
                  }
                  setDraggedPlayer(null);
                };
                
                const handleClick = () => {
                  // Click fallback: if player is selected, assign them
                  if (selectedPlayerId) {
                    onPlayerAssign(selectedPlayerId, optionKey);
                  }
                };

                return (
                  <div
                    key={idx}
                    className={cn(
                      "border rounded-lg p-4 relative overflow-hidden transition-colors cursor-pointer",
                      // Revealed state: Strong green for correct, faded for wrong
                      isRevealed && isCorrect && "border-green-500 bg-green-100 ring-4 ring-green-300 font-bold",
                      isRevealed && !isCorrect && "opacity-60 bg-gray-50",
                      // Locked state: Subtle indicator for correct answer (host only)
                      isLocked && isCorrect && "border-green-400 bg-green-50 ring-2 ring-green-200",
                      draggedPlayer && "border-dashed border-2 border-blue-400",
                      selectedPlayerId && "ring-2 ring-blue-400"
                    )}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={handleClick}
                  >
                    {/* Progress bar */}
                    <div
                      className="absolute inset-0 bg-blue-100 transition-all"
                      style={{ width: `${percentage}%` }}
                    />

                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg w-8">
                          {optionKey}.
                        </span>
                        <span className="font-medium">{opt}</span>
                        {/* Correct answer indicator for host in lock state */}
                        {isLocked && isCorrect && (
                          <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full">
                            ✓ CORRECT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Viewer stats */}
                        <div className="text-sm text-gray-600">
                          {voteCount} votes ({percentage.toFixed(0)}%)
                        </div>

                        {/* Player avatars with reveal badges */}
                        <div className="flex gap-1">
                          {assignedPlayers.map((player) => (
                            <div key={player.id} className="relative">
                              <PlayerAvatarChip
                                playerId={player.id}
                                playerName={player.name}
                                playerAvatar={player.avatar}
                                size="sm"
                                draggable={false}
                              />
                              {phase === "reveal" && (
                                <div
                                  className={cn(
                                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold",
                                    isCorrect
                                      ? "bg-green-500 text-white"
                                      : "bg-gray-400 text-white"
                                  )}
                                >
                                  {isCorrect ? "✓" : "0"}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Closest Mode */}
          {question.type === "closest" && (
            <div className="space-y-4">
              <div className={cn(
                "p-4 border rounded-lg",
                (phase === "lock" || phase === "reveal") && typeof question.correct === "number" && "bg-green-50 border-green-400"
              )}>
                <label className="block text-sm font-medium mb-2">
                  Target Value
                </label>
                {(phase === "lock" || phase === "reveal" || phase === "score_update") && typeof question.correct === "number" ? (
                  <div className="text-3xl font-bold text-green-700">
                    {question.correct}
                    <span className="ml-3 px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full align-middle">
                      ✓ CORRECT ANSWER
                    </span>
                  </div>
                ) : (
                  <input
                    type="number"
                    placeholder="Enter correct value"
                    className="border rounded px-3 py-2 w-full"
                    readOnly
                  />
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Viewers: {totalVotes} guesses
                </p>
              </div>

              {/* Winner Selection for Closest Questions */}
              {(phase === "reveal" || phase === "score_update") && (
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <h4 className="font-semibold mb-3 text-blue-800">Select Winners</h4>
                  <p className="text-sm text-blue-600 mb-3">
                    Click on players to mark them as winners (multiple winners allowed), then Validate
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {players.map((player) => {
                      const isWinner = selectedWinners.includes(player.id);
                      return (
                        <button
                          key={player.id}
                          onClick={() => onWinnerSelect(player.id, !isWinner)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all",
                            isWinner
                              ? "bg-green-100 border-green-500 text-green-800"
                              : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                          )}
                        >
                          <PlayerAvatarChip
                            playerId={player.id}
                            playerName={player.name}
                            playerAvatar={player.avatar}
                            size="sm"
                            draggable={false}
                          />
                          <span className="font-medium">{player.name}</span>
                          {isWinner && (
                            <span className="text-green-600 font-bold">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-sm text-green-600">
                    Click a player to toggle winner status. Points are applied immediately.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Zoom Reveal Mode */}
          {isZoomMode && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-indigo-50 border-indigo-200">
                <h4 className="font-semibold mb-2 text-indigo-800">Zoom Reveal Question</h4>
                <p className="text-sm text-indigo-600">
                  The image will gradually zoom out in the overlay.
                  Use the controls below to start/pause the reveal.
                </p>
              </div>

              {/* Winner Selection for Zoom Reveal Questions */}
              {(phase === "reveal" || phase === "score_update") && (
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <h4 className="font-semibold mb-3 text-blue-800">Select Winners</h4>
                  <p className="text-sm text-blue-600 mb-3">
                    Click on players who correctly identified the image (multiple winners allowed)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {players.map((player) => {
                      const isWinner = selectedWinners.includes(player.id);
                      return (
                        <button
                          key={player.id}
                          onClick={() => onWinnerSelect(player.id, !isWinner)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all",
                            isWinner
                              ? "bg-green-100 border-green-500 text-green-800"
                              : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                          )}
                        >
                          <PlayerAvatarChip
                            playerId={player.id}
                            playerName={player.name}
                            playerAvatar={player.avatar}
                            size="sm"
                            draggable={false}
                          />
                          <span className="font-medium">{player.name}</span>
                          {isWinner && (
                            <span className="text-green-600 font-bold">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedWinners.length > 0 && (
                    <p className="text-sm text-green-600 mt-2">
                      {selectedWinners.length} winner{selectedWinners.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                  <p className="mt-3 text-sm text-blue-600">
                    Click a player to toggle winner status. Points are applied immediately.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mystery Image Mode */}
          {isMysteryImageMode && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                <h4 className="font-semibold mb-2 text-purple-800">Mystery Image Question</h4>
                <p className="text-sm text-purple-600">
                  The image will be revealed square by square in the overlay.
                  Use the controls below to start/pause the reveal.
                </p>
                {mysteryTotalSquares > 0 && (
                  <p className="text-xs text-purple-500 mt-2">
                    Grid: {mysteryTotalSquares} squares total
                  </p>
                )}
              </div>

              {/* Winner Selection for Mystery Image Questions */}
              {(phase === "reveal" || phase === "score_update") && (
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <h4 className="font-semibold mb-3 text-blue-800">Select Winners</h4>
                  <p className="text-sm text-blue-600 mb-3">
                    Click on players who correctly identified the image (multiple winners allowed)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {players.map((player) => {
                      const isWinner = selectedWinners.includes(player.id);
                      return (
                        <button
                          key={player.id}
                          onClick={() => onWinnerSelect(player.id, !isWinner)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all",
                            isWinner
                              ? "bg-green-100 border-green-500 text-green-800"
                              : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                          )}
                        >
                          <PlayerAvatarChip
                            playerId={player.id}
                            playerName={player.name}
                            playerAvatar={player.avatar}
                            size="sm"
                            draggable={false}
                          />
                          <span className="font-medium">{player.name}</span>
                          {isWinner && (
                            <span className="text-green-600 font-bold">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedWinners.length > 0 && (
                    <p className="text-sm text-green-600 mt-2">
                      {selectedWinners.length} winner{selectedWinners.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                  <p className="mt-3 text-sm text-blue-600">
                    Click a player to toggle winner status. Points are applied immediately.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Open Mode */}
          {question.type === "open" && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Open Answers (Viewers)</h4>
                <p className="text-sm text-gray-600">
                  {totalVotes} responses received
                </p>
              </div>

              {/* Winner Selection for Open Questions */}
              {(phase === "reveal" || phase === "score_update") && (
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <h4 className="font-semibold mb-3 text-blue-800">Select Winners</h4>
                  <p className="text-sm text-blue-600 mb-3">
                    Click on players to mark them as winners (multiple winners allowed)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {players.map((player) => {
                      const isWinner = selectedWinners.includes(player.id);
                      return (
                        <button
                          key={player.id}
                          onClick={() => onWinnerSelect(player.id, !isWinner)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all",
                            isWinner
                              ? "bg-green-100 border-green-500 text-green-800"
                              : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                          )}
                        >
                          <PlayerAvatarChip
                            playerId={player.id}
                            playerName={player.name}
                            playerAvatar={player.avatar}
                            size="sm"
                            draggable={false}
                          />
                          <span className="font-medium">{player.name}</span>
                          {isWinner && (
                            <span className="text-green-600 font-bold">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedWinners.length > 0 && (
                    <p className="text-sm text-green-600 mt-2">
                      {selectedWinners.length} winner{selectedWinners.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="border-t px-6 py-4 bg-gray-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Timer */}
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-600" />
            <span
              className={cn(
                "text-2xl font-mono font-bold",
                timerSeconds < 10 && "text-red-600"
              )}
            >
              {formatTime(timerSeconds)}
            </span>
            <div className="flex gap-2">
              {timerRunning ? (
                <Button size="sm" variant="outline" onClick={onTimerStop}>
                  <Pause className="w-4 h-4" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={onTimerStart}>
                  <Play className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTimerAdd(10)}
              >
                <Plus className="w-4 h-4 mr-1" />
                10s
              </Button>
            </div>
          </div>

          {/* Zoom Controls */}
          {isZoomMode && onZoomStart && onZoomStop && onZoomResume && (
            <div className="flex items-center gap-3 border-l pl-4">
              <span className="text-sm font-medium text-gray-600">
                Zoom Reveal:
              </span>
              <div className="flex gap-2">
                {zoomRunning ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      onZoomStop();
                      setZoomRunning(false);
                    }}
                  >
                    <Pause className="w-3 h-3 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => {
                      if (zoomStarted) {
                        onZoomResume();
                      } else {
                        onZoomStart();
                        setZoomStarted(true);
                      }
                      setZoomRunning(true);
                    }}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    {zoomStarted ? "Resume" : "Start"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Mystery Image Controls */}
          {isMysteryImageMode && onMysteryStart && onMysteryStop && onMysteryResume && (
            <div className="flex items-center gap-3 border-l pl-4">
              <span className="text-sm font-medium text-gray-600">
                Mystery Reveal {mysteryTotalSquares > 0 && `(${mysteryTotalSquares} squares)`}:
              </span>
              <div className="flex gap-2">
                {mysteryRunning ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      onMysteryStop();
                      setMysteryRunning(false);
                    }}
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="default" 
                    onClick={() => {
                      if (mysteryStarted) {
                        // Resume from where we paused
                        onMysteryResume();
                      } else {
                        // First time - start from beginning
                        const total = mysteryTotalSquares > 0 ? mysteryTotalSquares : 500;
                        onMysteryStart(total);
                        setMysteryStarted(true);
                      }
                      setMysteryRunning(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={mysteryTotalSquares === 0}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {mysteryStarted ? "Resume" : "Start"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Phase Actions */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="default"
              onClick={onLock}
              disabled={phase !== "accept_answers"}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Lock
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={onReveal}
              disabled={phase !== "lock"}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reveal
            </Button>

            <div className="h-6 w-px bg-gray-300 mx-2" />

            <Button
              size="sm"
              variant="destructive"
              onClick={onResetQuestion}
            >
              Reset Question
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

