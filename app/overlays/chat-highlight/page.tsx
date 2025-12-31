"use client";

import { ChatHighlightRenderer } from "@/components/overlays/ChatHighlightRenderer";

export default function ChatHighlightOverlayPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <ChatHighlightRenderer />
    </div>
  );
}
