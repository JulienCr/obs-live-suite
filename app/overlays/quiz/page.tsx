import { QuizRenderer } from "@/components/quiz/QuizRenderer";

export default function QuizOverlayPage() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-transparent">
      <QuizRenderer />
    </div>
  );
}

