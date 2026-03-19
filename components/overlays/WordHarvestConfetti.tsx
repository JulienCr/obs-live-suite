"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { CONFETTI_COLORS } from "./wordHarvestAnimations";

interface WordHarvestConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

export function WordHarvestConfetti({ active, onComplete }: WordHarvestConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firedRef = useRef(false);
  const confettiRef = useRef<confetti.CreateTypes | null>(null);

  useEffect(() => {
    if (!active || firedRef.current || !canvasRef.current) return;
    firedRef.current = true;

    const myConfetti = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });
    confettiRef.current = myConfetti;

    const delays = [0, 400, 800];
    const timers: ReturnType<typeof setTimeout>[] = [];
    delays.forEach((delay) => {
      timers.push(setTimeout(() => {
        myConfetti({
          particleCount: 150,
          spread: 160,
          origin: { y: 0.5, x: 0.5 },
          colors: CONFETTI_COLORS,
          gravity: 0.8,
          ticks: 200,
        });
      }, delay));
    });

    // Signal completion after confetti settles
    timers.push(setTimeout(() => {
      onComplete?.();
    }, 4000));

    return () => {
      timers.forEach(clearTimeout);
      confettiRef.current?.reset();
      confettiRef.current = null;
    };
  }, [active, onComplete]);

  // Reset firedRef when deactivated
  useEffect(() => {
    if (!active) {
      firedRef.current = false;
    }
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: 1920,
        height: 1080,
        zIndex: 30,
        pointerEvents: "none",
      }}
    />
  );
}
