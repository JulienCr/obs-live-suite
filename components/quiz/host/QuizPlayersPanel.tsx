"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlayerAvatarChip } from "./PlayerAvatarChip";

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

interface PlayersPanelProps {
  players: PlayerScore[];
  viewers: ViewerScore[];
  viewerInputEnabled: boolean;
  selectedPlayerId?: string | null;
  onToggleViewerInput: () => void;
  onQuickAnswer: (playerId: string, answer: string) => void;
  onPlayerSelect?: (playerId: string | null) => void;
}

export function QuizPlayersPanel({
  players,
  viewers,
  viewerInputEnabled,
  selectedPlayerId,
  onToggleViewerInput,
  onQuickAnswer,
  onPlayerSelect,
}: PlayersPanelProps) {
  const topViewers = viewers
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <aside className="w-80 border-l bg-gray-50 overflow-y-auto">
      {/* Studio Players */}
      <div className="p-4 border-b bg-white">
        <h3 className="font-semibold text-sm mb-3">Studio Players</h3>
        <div className="space-y-3">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded"
            >
              <PlayerAvatarChip
                playerId={player.id}
                playerName={player.name}
                playerAvatar={player.avatar}
                size="md"
                draggable={true}
                selected={selectedPlayerId === player.id}
                onClick={onPlayerSelect ? (id) => {
                  // Toggle selection: if already selected, deselect; else select
                  onPlayerSelect(selectedPlayerId === id ? null : id);
                } : undefined}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {player.name}
                </div>
                <div className="text-xs text-gray-600">
                  Score: {player.score}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Answer Buttons */}
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-2">Quick Assign</p>
          <div className="grid grid-cols-4 gap-1">
            {["A", "B", "C", "D"].map((opt) => (
              <Button
                key={opt}
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => {
                  /* TODO: implement */
                }}
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Viewers */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-3">Top Viewers</h3>
        {topViewers.length > 0 ? (
          <div className="space-y-2">
            {topViewers.map((viewer, idx) => (
              <div
                key={viewer.userId}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">#{idx + 1}</span>
                  <span className="font-medium truncate max-w-[140px]">
                    {viewer.displayName}
                  </span>
                </div>
                <span className="text-xs text-gray-600">{viewer.score}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No viewers yet</p>
        )}
      </div>

      {/* Viewer Input Control */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm mb-2">Viewer Input</h3>
        <Button
          size="sm"
          variant={viewerInputEnabled ? "default" : "outline"}
          onClick={onToggleViewerInput}
          className={cn(
            "w-full",
            viewerInputEnabled && "bg-green-600 hover:bg-green-700"
          )}
        >
          {viewerInputEnabled ? "Accepting Answers" : "Closed"}
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          ⚡ Active viewers: {viewers.length}
        </p>
      </div>

      {/* Event Log - Hidden until telemetry implemented */}
    </aside>
  );
}

