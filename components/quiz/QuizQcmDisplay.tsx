interface QuizQcmDisplayProps {
  voteCounts?: Record<string, number>;
  votePercentages?: Record<string, number>;
  phase: string;
  question?: {
    text: string;
    options?: string[];
    optionsAreImages?: boolean;
    correct?: number;
  };
  playerAssignments?: Record<string, string>; // playerId -> option
  players?: Array<{ id: string; name?: string; displayName?: string; avatar?: string; avatarUrl?: string }>;
}

// Custom soft glow animation
const glowKeyframes = `
  @keyframes softGlow {
    0%, 100% { 
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
      opacity: 0.9;
    }
    50% { 
      box-shadow: 0 0 40px rgba(34, 197, 94, 0.8);
      opacity: 1;
    }
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = glowKeyframes;
  document.head.appendChild(style);
}

export function QuizQcmDisplay({ voteCounts, votePercentages, phase, question, playerAssignments, players }: QuizQcmDisplayProps) {
  // Hide during transition
  if (phase === "idle" || phase === "hiding" || !question) return null;

  const options = ["A", "B", "C", "D"];
  const colors = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500"];
  const questionText = question?.text || "";
  const optionTexts = question?.options || options;
  const optionsAreImages = question?.optionsAreImages || false;
  const isRevealed = phase === "reveal";
  const correctIndex = question?.correct;
  
  // Initialize vote data if not present
  const safeCounts = voteCounts || {};
  const safePercentages = votePercentages || {};
  
  // Get players assigned to each option
  const getAssignedPlayers = (opt: string) => {
    if (!playerAssignments || !players) return [];
    return players.filter(p => p && playerAssignments[p.id] === opt);
  };
  
  // Helper to get player name
  const getPlayerName = (p: any) => p.displayName || p.name || "";
  
  // Helper to get player avatar
  const getPlayerAvatar = (p: any) => p.avatarUrl || p.avatar;

  // If options are images, show grid layout
  if (optionsAreImages && optionTexts.every(o => o.startsWith("http"))) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
        {questionText && (
          <div className="mb-8 text-white text-3xl font-bold text-center bg-black/70 px-8 py-4 rounded-lg">
            {questionText}
          </div>
        )}
        <div className="grid grid-cols-2 gap-6 w-[900px]">
          {options.map((opt, idx) => {
            const pct = safePercentages[opt] || 0;
            const count = safeCounts[opt] || 0;
            const imgUrl = optionTexts[idx];
            const isCorrect = isRevealed && correctIndex === idx;
            const isWrong = isRevealed && correctIndex !== idx;
            const assignedPlayers = getAssignedPlayers(opt);
            
            return (
              <div 
                key={opt} 
                className={`relative rounded-lg overflow-hidden transition-all duration-500 ${
                  isCorrect ? 'ring-8 ring-green-400' : 
                  isWrong ? 'opacity-50' : 
                  ''
                }`}
                style={isCorrect ? { animation: 'softGlow 2s ease-in-out infinite' } : {}}
              >
                <img src={imgUrl} alt={opt} className="w-full h-64 object-cover" />
                <div className={`absolute bottom-0 inset-x-0 p-4 ${
                  isCorrect ? 'bg-green-600/90' : 'bg-black/80'
                }`}>
                  <div className="flex justify-between items-center text-white font-bold text-xl">
                    <div className="flex items-center gap-2">
                      <span>{opt}</span>
                      {assignedPlayers.length > 0 && (
                        <div className="flex gap-1">
                          {assignedPlayers.filter(p => p && getPlayerName(p)).map(p => {
                            const name = getPlayerName(p);
                            const avatar = getPlayerAvatar(p);
                            return (
                              <div key={p.id} className="w-8 h-8 rounded-full bg-gray-700 border-2 border-white flex items-center justify-center text-xs overflow-hidden">
                                {avatar ? (
                                  <img src={avatar} alt={name || 'Player'} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white font-bold text-sm">{name[0]?.toUpperCase()}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isCorrect ? 'bg-green-300' : 
                        isWrong ? 'bg-gray-500' : 
                        colors[idx]
                      }`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Text options - bar display
  return (
    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[800px] space-y-3">
      {questionText && (
        <div className="mb-6 text-white text-2xl font-bold text-center bg-black/70 px-6 py-3 rounded-lg">
          {questionText}
        </div>
      )}
      {options.map((opt, idx) => {
        const pct = safePercentages[opt] || 0;
        const count = safeCounts[opt] || 0;
        const label = optionTexts[idx] || opt;
        const isCorrect = isRevealed && correctIndex === idx;
        const isWrong = isRevealed && correctIndex !== idx;
        const assignedPlayers = getAssignedPlayers(opt);
        
        return (
          <div 
            key={opt} 
            className={`relative h-16 rounded-lg overflow-hidden transition-all duration-500 ${
              isCorrect ? 'bg-green-600/90 ring-4 ring-green-400' : 
              isWrong ? 'bg-gray-600/60' : 
              'bg-gray-800/90'
            }`}
            style={isCorrect ? { animation: 'softGlow 2s ease-in-out infinite' } : {}}
          >
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                isCorrect ? 'bg-green-400' : 
                isWrong ? 'bg-gray-500' : 
                colors[idx]
              }`}
              style={{ width: `${pct}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-6 text-white font-bold text-xl">
              <div className="flex items-center gap-3">
                <span>{opt}. {label}</span>
                {assignedPlayers.length > 0 && (
                  <div className="flex gap-2">
                    {assignedPlayers.filter(p => p && getPlayerName(p)).map(p => {
                      const name = getPlayerName(p);
                      const avatar = getPlayerAvatar(p);
                      return (
                        <div key={p.id} className="w-10 h-10 rounded-full bg-gray-700 border-2 border-white flex items-center justify-center text-sm overflow-hidden">
                          {avatar ? (
                            <img src={avatar} alt={name || 'Player'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold text-base">{name[0]?.toUpperCase()}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <span>{count} ({pct.toFixed(0)}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

