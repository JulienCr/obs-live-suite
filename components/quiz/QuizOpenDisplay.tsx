interface QuizOpenDisplayProps {
  questionText?: string;
  phase: string;
  topAnswers?: Array<{ userId: string; displayName: string; text: string }>;
  winner?: { name: string; avatar?: string };
}

export function QuizOpenDisplay({ questionText, phase, topAnswers, winner }: QuizOpenDisplayProps) {
  if (phase === "idle" || phase === "hiding") return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
      {/* Question Text */}
      {questionText && (
        <div className="mb-8 text-white text-4xl font-bold text-center bg-black/70 px-8 py-6 rounded-lg max-w-4xl">
          {questionText}
        </div>
      )}

      {/* Instructions or Winner */}
      {phase === "accept_answers" && (
        <div className="text-white text-2xl text-center bg-blue-600/90 px-8 py-4 rounded-lg">
          Host will select the best answer
        </div>
      )}

      {phase === "reveal" && winner && (
        <div className="bg-green-600 text-white px-12 py-6 rounded-lg flex items-center gap-6 animate-pulse">
          {winner.avatar && (
            <img src={winner.avatar} alt={winner.name} className="w-20 h-20 rounded-full border-4 border-white" />
          )}
          <div>
            <div className="text-lg font-medium">WINNER</div>
            <div className="text-4xl font-bold">{winner.name}</div>
          </div>
        </div>
      )}

      {/* Top Viewer Answers (Scrolling) */}
      {topAnswers && topAnswers.length > 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[1200px]">
          <div className="bg-black/80 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
            <div className="text-white text-sm font-semibold mb-2 uppercase tracking-wide">
              Viewer Answers
            </div>
            {topAnswers.map((answer, idx) => (
              <div key={idx} className="bg-gray-800/70 rounded px-4 py-2 text-white">
                <span className="font-semibold text-blue-400">{answer.displayName}:</span>{" "}
                <span className="text-gray-200">{answer.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

