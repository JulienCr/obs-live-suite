"use client";

import { useState, useCallback, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageInputProps {
  onSend: (message: string) => Promise<boolean>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatMessageInput({
  onSend,
  disabled,
  placeholder = "Send a message...",
  className,
}: ChatMessageInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending || disabled) return;

    setSending(true);
    const success = await onSend(message.trim());
    setSending(false);

    if (success) {
      setMessage("");
    }
  }, [message, sending, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex gap-2 p-2 border-t bg-card", className)}>
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || sending}
        className="h-8 text-sm"
      />
      <Button
        size="sm"
        onClick={handleSend}
        disabled={!message.trim() || disabled || sending}
        className="h-8 px-3"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </Button>
    </div>
  );
}
