"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlayerAvatarChip } from "./PlayerAvatarChip";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  onPlayerSelect?: (playerId: string | null) => void;
  onScoreUpdate?: (playerId: string, newScore: number) => void;
  onScoreUpdateComplete?: (updatedCount: number) => void;
}

export function QuizPlayersPanel({
  players,
  viewers,
  viewerInputEnabled,
  selectedPlayerId,
  onToggleViewerInput,
  onPlayerSelect,
  onScoreUpdate,
  onScoreUpdateComplete,
}: PlayersPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<string, string>>({});

  const topViewers = viewers
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const openScoreModal = () => {
    const scores: Record<string, string> = {};
    players.forEach(player => {
      scores[player.id] = player.score.toString();
    });
    setEditingScores(scores);
    setIsModalOpen(true);
  };

  const handleScoreUpdate = async () => {
    if (!onScoreUpdate) return;
    
    const updates: Array<{ playerId: string; newScore: number }> = [];
    
    for (const [playerId, scoreStr] of Object.entries(editingScores)) {
      const newScore = parseInt(scoreStr);
      if (!isNaN(newScore)) {
        const currentScore = players.find(p => p.id === playerId)?.score || 0;
        if (newScore !== currentScore) {
          updates.push({ playerId, newScore });
        }
      }
    }
    
    try {
      // Apply all updates at once
      for (const update of updates) {
        await onScoreUpdate(update.playerId, update.newScore);
      }
      
      setIsModalOpen(false);
      // Show success message
      if (updates.length > 0 && onScoreUpdateComplete) {
        onScoreUpdateComplete(updates.length);
      }
    } catch (error) {
      console.error("Failed to update scores:", error);
      // Keep modal open on error so user can retry
    }
  };

  return (
    <aside className="w-80 border-l bg-gray-50 overflow-y-auto">
      {/* Studio Players */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Studio Players</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={openScoreModal}
            className="text-xs h-6 px-2"
          >
            Edit Scores
          </Button>
        </div>
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
      
      {/* Score Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Player Scores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {players.map((player) => (
              <div key={player.id} className="flex items-center gap-3">
                <PlayerAvatarChip
                  playerId={player.id}
                  playerName={player.name}
                  playerAvatar={player.avatar}
                  size="sm"
                  draggable={false}
                />
                <div className="flex-1">
                  <Label htmlFor={`score-${player.id}`} className="text-sm font-medium">
                    {player.name}
                  </Label>
                </div>
                <Input
                  id={`score-${player.id}`}
                  type="number"
                  value={editingScores[player.id] || ""}
                  onChange={(e) => setEditingScores(prev => ({
                    ...prev,
                    [player.id]: e.target.value
                  }))}
                  className="w-20"
                  min="0"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleScoreUpdate} className="flex-1">
              Update All Scores
            </Button>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

