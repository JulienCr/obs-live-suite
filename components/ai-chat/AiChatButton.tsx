"use client";

import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { useAiChatStore } from "@/lib/stores/aiChatStore";

export function AiChatButton() {
  const toggle = useAiChatStore((s) => s.toggle);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      title="AI Assistant"
      className="h-8 w-8 p-0"
    >
      <Bot className="w-4 h-4" />
    </Button>
  );
}
