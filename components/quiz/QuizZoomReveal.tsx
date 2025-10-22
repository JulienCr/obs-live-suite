interface QuizZoomRevealProps {
  imageUrl?: string;
  questionText?: string;
  zoomLevel?: number;        // Current step (0 to zoomSteps)
  zoomSteps?: number;         // Total steps (default: 20)
  zoomMaxZoom?: number;       // Max zoom multiplier (default: 26x)
  phase: string;
  buzzerWinner?: { name: string; avatar?: string };
}

export function QuizZoomReveal({ 
  imageUrl, 
  questionText, 
  zoomLevel = 0, 
  zoomSteps = 600,  // Default: 20 seconds * 30 fps
  zoomMaxZoom = 35, // Default: matches current config in QuizManager
  phase, 
  buzzerWinner 
}: QuizZoomRevealProps) {
  if (phase === "idle" || phase === "hiding" || !imageUrl) return null;

  // On reveal or score_update, show fully zoomed out (1x)
  let scale = 1;
  
  if (phase !== "reveal" && phase !== "score_update") {
    // Calculate zoom scale with ease-out cubic easing
    // This makes the dezoom slower as it approaches 1x (more natural feel)
    
    // Linear progress from 0 (start) to 1 (end)
    const linearProgress = zoomLevel / zoomSteps;
    
    // Apply ease-out cubic: fast at start, slow at end
    // Formula: 1 - (1 - t)³
    const easedProgress = 1 - Math.pow(1 - linearProgress, 3);
    
    // Calculate scale using eased progress
    // Start: easedProgress=0 → scale = 1 + maxZoom (e.g., 36x)
    // End:   easedProgress=1 → scale = 1 (fully zoomed out)
    scale = 1 + (1 - easedProgress) * zoomMaxZoom;
  }

  return (
    <div className="absolute inset-0 animate-in fade-in duration-700">
      {/* Question Text at bottom */}
      {questionText && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white text-2xl font-bold text-center bg-black/70 px-6 py-3 rounded-lg max-w-3xl">
          {questionText}
        </div>
      )}

      {/* Zoomed Image - bottom positioned, medium size, respecting aspect ratio */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-lg overflow-hidden shadow-2xl" style={{ maxWidth: '600px', maxHeight: '450px' }}>
        <div
          className="relative overflow-hidden"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            transition: "transform 500ms ease-out",
            maxWidth: '600px',
            maxHeight: '450px',
          }}
        >
          <img
            src={imageUrl}
            alt="Zoom reveal"
            className="w-full h-full object-contain"
            style={{ maxWidth: '600px', maxHeight: '450px' }}
          />
        </div>
      </div>

      {/* Buzzer Winner */}
      {buzzerWinner && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 px-8 py-6 rounded-lg shadow-2xl animate-pulse z-50">
          <div className="flex items-center gap-4">
            {buzzerWinner.avatar && (
              <img 
                src={buzzerWinner.avatar} 
                alt={buzzerWinner.name}
                className="w-16 h-16 rounded-full border-4 border-white"
              />
            )}
            <div>
              <div className="text-sm font-bold text-yellow-900 uppercase">Buzzer!</div>
              <div className="text-2xl font-bold text-white">{buzzerWinner.name}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

