interface QuizTimerDisplayProps {
  seconds?: number;
  phase: string;
}

export function QuizTimerDisplay({ seconds, phase }: QuizTimerDisplayProps) {
  if (phase === "idle" || phase === "hiding" || seconds === undefined) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="absolute top-8 right-8 bg-black/80 text-white px-6 py-3 rounded-lg text-3xl font-bold">
      {display}
    </div>
  );
}

