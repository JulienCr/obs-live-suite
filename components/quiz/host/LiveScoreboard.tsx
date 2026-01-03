"use client";

import { useTranslations } from "next-intl";

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

interface LiveScoreboardProps {
  players: PlayerScore[];
  viewers: ViewerScore[];
}

export function LiveScoreboard({ players, viewers }: LiveScoreboardProps) {
  const t = useTranslations("quiz.host.liveScoreboard");
  const topViewers = viewers.sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Studio Players */}
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-3">{t("studioPlayers")}</h3>
        {players.length === 0 && (
          <div className="text-sm text-gray-400">{t("noPlayersYet")}</div>
        )}
        <div className="space-y-2">
          {players.map((player, idx) => (
            <div key={player.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
              <span className="font-bold text-lg w-6">{idx + 1}</span>
              {player.avatar && (
                <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
              )}
              <div className="flex-1">
                <div className="font-medium">{player.name}</div>
              </div>
              <div className="text-xl font-bold text-blue-600">{player.score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Viewers */}
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-3">{t("topViewers")}</h3>
        {topViewers.length === 0 && (
          <div className="text-sm text-gray-400">{t("noViewerScoresYet")}</div>
        )}
        <div className="space-y-1">
          {topViewers.map((viewer, idx) => (
            <div key={viewer.userId} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
              <span className="font-bold w-5">{idx + 1}</span>
              <div className="flex-1 font-medium">{viewer.displayName}</div>
              <div className="font-bold text-green-600">{viewer.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

