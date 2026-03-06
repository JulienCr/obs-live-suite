"use client";

import { useTranslations } from "next-intl";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAiChatStore } from "@/lib/stores/aiChatStore";
import { AiChatMessages } from "./AiChatMessages";
import { AiChatInput } from "./AiChatInput";

const transport = new DefaultChatTransport({ api: "/api/ai/chat" });

export function AiChatSheet() {
  const t = useTranslations("aiChat");
  const isOpen = useAiChatStore((s) => s.isOpen);
  const close = useAiChatStore((s) => s.close);

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="w-[400px] sm:max-w-[400px] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="text-base">{t("title")}</SheetTitle>
        </SheetHeader>

        <AiChatMessages
          messages={messages}
          isLoading={isLoading}
          addToolOutput={addToolOutput}
        />

        <AiChatInput
          sendMessage={sendMessage}
          isLoading={isLoading}
        />
      </SheetContent>
    </Sheet>
  );
}
