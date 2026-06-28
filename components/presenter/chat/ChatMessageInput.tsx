"use client";

import { useState, useCallback, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSendTarget } from "@/lib/models/StreamerbotChat";

interface ChatMessageInputProps {
  onSend: (message: string, target: ChatSendTarget) => Promise<boolean>;
  /** Currently selected destination platform(s). Defaults to "both". */
  sendTarget?: ChatSendTarget;
  /** Called when the user changes the destination (persist this to remember it). */
  onSendTargetChange?: (target: ChatSendTarget) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatMessageInput({
  onSend,
  sendTarget = "both",
  onSendTargetChange,
  disabled,
  placeholder = "Send a message...",
  className,
}: ChatMessageInputProps) {
  const t = useTranslations("presenter.chat");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending || disabled) return;

    setSending(true);
    try {
      const success = await onSend(message.trim(), sendTarget);
      if (success) {
        setMessage("");
      }
    } finally {
      // Always re-enable the input, even if onSend rejects.
      setSending(false);
    }
  }, [message, sending, disabled, onSend, sendTarget]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex gap-2 p-2 border-t bg-card", className)}>
      {/* Only show the destination selector when the parent can persist the change.
          Without onSendTargetChange the Select would be controlled but inert. */}
      {onSendTargetChange && (
        <Select
          value={sendTarget}
          onValueChange={(v) => onSendTargetChange(v as ChatSendTarget)}
          disabled={disabled || sending}
        >
          <SelectTrigger className="h-8 w-[96px] text-xs shrink-0" aria-label={t("sendTo.label")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">{t("sendTo.both")}</SelectItem>
            <SelectItem value="twitch">Twitch</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
      )}
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
