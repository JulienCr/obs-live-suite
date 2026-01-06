"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Dashboard error boundary
 * Catches errors in the main dashboard page
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-var(--header-height))] p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Dashboard Error</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm mb-4">
            Failed to load the dashboard. This may be due to a connection issue
            or a configuration problem.
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
