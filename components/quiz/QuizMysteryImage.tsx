"use client";
import React, { useEffect, useState, useMemo } from "react";

interface QuizMysteryImageProps {
  imageUrl?: string;
  questionText?: string;
  phase: string;
  revealedSquares?: number; // Number of squares revealed so far
  totalSquares?: number; // Total squares in the grid
  buzzerWinner?: { name: string; avatar?: string };
}

/**
 * Mystery Image - Progressive square-by-square reveal
 * Image is divided into 20px squares, revealed one random square at a time
 */
export function QuizMysteryImage({
  imageUrl,
  questionText,
  phase,
  revealedSquares = 0,
  totalSquares,
  buzzerWinner,
}: QuizMysteryImageProps) {
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [revealOrder, setRevealOrder] = useState<number[]>([]);

  // Load image to get dimensions
  useEffect(() => {
    if (!imageUrl) return;
    
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate grid dimensions (20px squares)
  const gridInfo = useMemo(() => {
    if (!imageSize) return null;

    const squareSize = 20;
    const cols = Math.ceil(imageSize.width / squareSize);
    const rows = Math.ceil(imageSize.height / squareSize);
    const total = cols * rows;

    return {
      squareSize,
      cols,
      rows,
      total,
      displayWidth: cols * squareSize,
      displayHeight: rows * squareSize,
    };
  }, [imageSize]);

  // Generate random reveal order when grid is ready
  useEffect(() => {
    if (!gridInfo) return;
    
    // Create array [0, 1, 2, ..., total-1]
    const order = Array.from({ length: gridInfo.total }, (_, i) => i);
    
    // Shuffle using Fisher-Yates algorithm
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    
    console.log(`Mystery image: Generated reveal order for ${gridInfo.total} squares`);
    setRevealOrder(order);
  }, [gridInfo]);

  // Log reveal progress
  useEffect(() => {
    if (revealedSquares > 0 && totalSquares && totalSquares > 0) {
      console.log(`Mystery reveal: ${revealedSquares}/${totalSquares} squares revealed`);
    }
  }, [revealedSquares, totalSquares]);

  // Don't render during hiding phase or if no image
  if (phase === "hiding" || phase === "idle" || !imageUrl || !gridInfo || revealOrder.length === 0) {
    return null;
  }

  const { squareSize, cols, rows, total, displayWidth, displayHeight } = gridInfo;
  
  // On reveal phase, show full image (all squares revealed)
  const effectiveRevealed = (phase === "reveal" || phase === "score_update") ? total : Math.min(revealedSquares, total);

  return (
    <div className="absolute inset-0">
      {/* Question text at bottom */}
      {questionText && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white text-2xl font-bold text-center bg-black/70 px-6 py-3 rounded-lg max-w-3xl">
          {questionText}
        </div>
      )}

      {/* Mystery image grid container - bottom positioned, medium size */}
      <div 
        className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-lg overflow-hidden shadow-2xl"
        style={{ 
          width: `${displayWidth}px`, 
          height: `${displayHeight}px`,
          maxWidth: '600px',
          maxHeight: '450px',
        }}
      >
        {/* Full image (background) */}
        <img
          src={imageUrl}
          alt="Mystery"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectFit: 'cover' }}
        />

        {/* Black overlay grid */}
        <div 
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${squareSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${squareSize}px)`,
          }}
        >
          {Array.from({ length: total }, (_, idx) => {
            const revealIndex = revealOrder.indexOf(idx);
            const isRevealed = revealIndex < effectiveRevealed;
            
            return (
              <div
                key={idx}
                className={`bg-black border border-gray-800/30 transition-opacity duration-300`}
                style={{
                  opacity: isRevealed ? 0 : 1,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Buzzer winner indicator */}
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

