"use client";

import { cn } from "@/lib/utils";
import type { MessagePart } from "@/lib/models/StreamerbotChat";

interface ChatMessageContentProps {
  parts?: MessagePart[];
  fallbackText: string;
  isMe?: boolean;
  className?: string;
}

export function ChatMessageContent({
  parts,
  fallbackText,
  isMe,
  className,
}: ChatMessageContentProps) {
  // If no parts, render fallback text
  if (!parts || parts.length === 0) {
    return (
      <span className={cn(isMe && "italic text-muted-foreground", className)}>
        {fallbackText}
      </span>
    );
  }

  return (
    <span className={cn(isMe && "italic text-muted-foreground", className)}>
      {parts.map((part, index) => {
        if (part.type === "emote") {
          return (
            <img
              key={index}
              src={part.imageUrl}
              alt={part.name}
              title={part.name}
              className="inline-block h-5 w-auto align-middle mx-0.5"
            />
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </span>
  );
}
