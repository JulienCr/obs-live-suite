"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Quiz manage error boundary
 * Catches errors in the question editor
 */
export default function QuizManageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Quiz manage error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-var(--topbar-height))] p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Question Editor Error</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm mb-4">
            Failed to load the question editor. Please try again or check the
            database connection.
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
