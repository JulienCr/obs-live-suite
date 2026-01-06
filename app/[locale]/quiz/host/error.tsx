"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Quiz host error boundary
 * Catches errors in the quiz host panel
 */
export default function QuizHostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Quiz host error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-screen p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Quiz Host Error</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm mb-4">
            Failed to load the quiz host panel. Please check the backend
            connection and try again.
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
