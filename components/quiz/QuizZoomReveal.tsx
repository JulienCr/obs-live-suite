interface QuizZoomRevealProps {
  imageUrl?: string;
  questionText?: string;
  zoomLevel?: number; // 0-100, where 100 is fully zoomed out
  phase: string;
  buzzerWinner?: { name: string; avatar?: string };
}

export function QuizZoomReveal({ imageUrl, questionText, zoomLevel = 0, phase, buzzerWinner }: QuizZoomRevealProps) {
  if (phase === "idle" || phase === "hiding" || !imageUrl) return null;

  // Calculate zoom scale (inverse: low zoomLevel = high zoom)
  const scale = 1 + (100 - zoomLevel) / 10; // 100% zoom = 1x, 0% zoom = 11x
  const opacity = Math.min(1, zoomLevel / 30); // Fade in as we zoom out

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
      {/* Question Text */}
      {questionText && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 text-white text-4xl font-bold text-center bg-black/70 px-8 py-4 rounded-lg max-w-4xl">
          {questionText}
        </div>
      )}

      {/* Zoomed Image */}
      <div className="relative w-[1200px] h-[700px] overflow-hidden rounded-lg border-4 border-white/20">
        <div
          className="absolute inset-0 transition-transform duration-500 ease-out"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <img
            src={imageUrl}
            alt="Mystery"
            className="w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity }}
          />
        </div>

        {/* Zoom Level Indicator */}
        <div className="absolute top-4 right-4 bg-black/70 px-4 py-2 rounded text-white font-mono">
          Zoom: {zoomLevel}%
        </div>
      </div>

      {/* Buzzer Winner */}
      {buzzerWinner && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-green-600 text-white px-8 py-4 rounded-lg flex items-center gap-4 animate-pulse">
          {buzzerWinner.avatar && (
            <img src={buzzerWinner.avatar} alt={buzzerWinner.name} className="w-12 h-12 rounded-full" />
          )}
          <div>
            <div className="text-sm font-medium">BUZZED IN</div>
            <div className="text-2xl font-bold">{buzzerWinner.name}</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {phase === "accept_answers" && !buzzerWinner && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-white text-xl text-center bg-blue-600/90 px-6 py-3 rounded-lg">
          Press your buzzer to answer!
        </div>
      )}
    </div>
  );
}

