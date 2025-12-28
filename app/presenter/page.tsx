"use client";

import { Suspense } from "react";
import { PresenterShell } from "@/components/presenter/PresenterShell";

function PresenterContent() {
  return <PresenterShell />;
}

export default function PresenterPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading presenter dashboard...</div>
      </div>
    }>
      <PresenterContent />
    </Suspense>
  );
}
