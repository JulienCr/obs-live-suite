import { QuizRenderer } from "@/components/quiz/QuizRenderer";
import { QuizErrorBoundary } from "@/components/quiz/QuizErrorBoundary";

export default function QuizOverlayPage() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-transparent">
      <QuizErrorBoundary>
        <QuizRenderer />
      </QuizErrorBoundary>
    </div>
  );
}

