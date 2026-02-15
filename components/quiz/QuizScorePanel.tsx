interface Player {
  id: string;
  name?: string;
  displayName?: string;
  score?: number;
}

interface QuizScorePanelProps {
  players?: Player[];
  visible?: boolean;
}

export function QuizScorePanel({ players, visible = true }: QuizScorePanelProps) {
  if (!visible || !players || players.length === 0) return null;

  return (
    <div className="absolute top-6 left-6 bg-black/80 backdrop-blur-xs rounded-lg p-3 min-w-[200px] border border-white/20">
      <h3 className="text-white text-sm font-bold mb-2 uppercase tracking-wide">Scores</h3>
      <div className="space-y-1">
        {players.map((p) => {
          const name = p.displayName || p.name || "Player";
          const score = p.score || 0;
          return (
            <div key={p.id} className="flex items-center justify-between text-white text-sm">
              <span className="font-medium">{name}</span>
              <span className="font-bold text-yellow-400 ml-3">{score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

