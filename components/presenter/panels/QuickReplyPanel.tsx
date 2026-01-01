"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QuickReplyPanelProps {
  quickReplies: string[];
  onSend: (text: string) => void;
  canSendCustomMessages?: boolean;
}

export function QuickReplyPanel({
  quickReplies,
  onSend,
  canSendCustomMessages = true
}: QuickReplyPanelProps) {
  const t = useTranslations("presenter");
  const [customText, setCustomText] = useState("");

  const handleQuickReply = (text: string) => {
    onSend(text);
  };

  const handleCustomSend = () => {
    if (customText.trim()) {
      onSend(customText.trim());
      setCustomText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCustomSend();
    }
  };

  return (
    <div className="p-3 space-y-2">
      {/* Quick reply buttons */}
      <div className="flex flex-wrap gap-2">
        {quickReplies.map((reply, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => handleQuickReply(reply)}
            className="text-xs"
          >
            {reply}
          </Button>
        ))}
      </div>

      {/* Custom text input - only show if enabled */}
      {canSendCustomMessages && (
        <div className="flex gap-2">
          <Input
            placeholder={t("quickReplies.customPlaceholder")}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-9"
          />
          <Button
            size="sm"
            onClick={handleCustomSend}
            disabled={!customText.trim()}
            className="h-9"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
