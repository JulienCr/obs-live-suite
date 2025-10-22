interface Player {
  id: string;
  name?: string;
  displayName?: string;
  avatar?: string;
  avatarUrl?: string;
}

interface QuizPlayersDisplayProps {
  players?: Player[];
}

export function QuizPlayersDisplay({ players }: QuizPlayersDisplayProps) {
  if (!players || players.length === 0) return null;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-6">
      {players.filter(p => p && (p.name || p.displayName)).map((p) => {
        const name = p.displayName || p.name || "";
        const avatar = p.avatarUrl || p.avatar;
        return (
          <div key={p.id} className="flex flex-col items-center gap-2 bg-black/70 p-4 rounded-lg">
            <div className="w-16 h-16 rounded-full bg-gray-600 overflow-hidden">
              {avatar ? (
                <img src={avatar} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                  {name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <span className="text-white font-semibold">{name}</span>
          </div>
        );
      })}
    </div>
  );
}

