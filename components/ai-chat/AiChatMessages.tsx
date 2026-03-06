"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Bot,
  User,
  Wrench,
  Check,
  X,
} from "lucide-react";
import type { UIMessage } from "ai";

interface AiChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  addToolOutput: (params: {
    tool: string;
    toolCallId: string;
    output: unknown;
  }) => void;
}

function ToolCallPart({
  part,
  addToolOutput,
}: {
  part: {
    type: string;
    toolCallId: string;
    state: string;
    input?: unknown;
    output?: unknown;
    errorText?: string;
  };
  addToolOutput: AiChatMessagesProps["addToolOutput"];
}) {
  const t = useTranslations("aiChat");
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract tool name from part.type (format: "tool-toolName")
  const toolName = part.type.startsWith("tool-")
    ? part.type.slice(5)
    : part.type;

  // Waiting for user confirmation (no execute on server)
  if (part.state === "input-available") {
    return (
      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 my-1 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-yellow-600 dark:text-yellow-400">
          <Wrench className="h-3 w-3" />
          {toolName}
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() =>
              addToolOutput({
                tool: toolName,
                toolCallId: part.toolCallId,
                output: { confirmed: true },
              })
            }
          >
            <Check className="h-3 w-3 mr-1" />
            {t("confirm")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() =>
              addToolOutput({
                tool: toolName,
                toolCallId: part.toolCallId,
                output: { confirmed: false, reason: "User cancelled" },
              })
            }
          >
            <X className="h-3 w-3 mr-1" />
            {t("cancel")}
          </Button>
        </div>
      </div>
    );
  }

  // Completed
  if (part.state === "output-available") {
    return (
      <div className="rounded-md border bg-muted/30 p-2 my-1 text-xs">
        <button
          className="flex items-center gap-1.5 font-medium text-muted-foreground w-full text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <Wrench className="h-3 w-3" />
          {toolName}
        </button>
        {isExpanded && (
          <pre className="mt-1 whitespace-pre-wrap text-[10px] text-muted-foreground max-h-40 overflow-auto">
            {typeof part.output === "string"
              ? part.output
              : JSON.stringify(part.output, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 my-1 text-xs text-destructive">
        <div className="flex items-center gap-1.5 font-medium">
          <Wrench className="h-3 w-3" />
          {toolName} - Error
        </div>
        {part.errorText && <p className="mt-1">{part.errorText}</p>}
      </div>
    );
  }

  // Streaming / in progress
  return (
    <div className="rounded-md border bg-muted/30 p-2 my-1 text-xs animate-pulse">
      <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <Wrench className="h-3 w-3" />
        {toolName}...
      </div>
    </div>
  );
}

export function AiChatMessages({
  messages,
  isLoading,
  addToolOutput,
}: AiChatMessagesProps) {
  const t = useTranslations("aiChat");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
        {t("emptyState")}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "user" ? (
            <div className="flex gap-2 justify-end">
              <div className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm max-w-[85%]">
                {message.parts
                  .filter((p) => p.type === "text")
                  .map((p, i) => (
                    <span key={i}>{p.text}</span>
                  ))}
              </div>
              <User className="h-5 w-5 mt-1 shrink-0 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex gap-2">
              <Bot className="h-5 w-5 mt-1 shrink-0 text-muted-foreground" />
              <div className="max-w-[85%] space-y-1">
                {message.parts.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <div
                        key={i}
                        className="rounded-lg bg-muted px-3 py-2 text-sm prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                      >
                        <ReactMarkdown
                          remarkPlugins={REMARK_PLUGINS}
                        >
                          {part.text}
                        </ReactMarkdown>
                      </div>
                    );
                  }
                  // Tool call parts have type "tool-<toolName>"
                  if (part.type.startsWith("tool-")) {
                    return (
                      <ToolCallPart
                        key={i}
                        part={part as unknown as {
                          type: string;
                          toolCallId: string;
                          state: string;
                          input?: unknown;
                          output?: unknown;
                          errorText?: string;
                        }}
                        addToolOutput={addToolOutput}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex gap-2">
          <Bot className="h-5 w-5 mt-1 shrink-0 text-muted-foreground" />
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="inline-flex gap-1">
              <span className="animate-bounce">.</span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.1s" }}
              >
                .
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.2s" }}
              >
                .
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
