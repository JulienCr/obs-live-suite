"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Assets error boundary
 * Catches errors in asset management pages
 */
export default function AssetsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Assets error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-var(--header-height))] p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Failed to Load Assets</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm mb-4">
            Could not load the asset library. Please check your connection and
            try again.
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
