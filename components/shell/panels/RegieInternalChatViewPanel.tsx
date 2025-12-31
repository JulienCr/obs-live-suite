"use client";

import { type IDockviewPanelProps } from "dockview-react";
import { MessageSquare, Wifi, WifiOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePresenterWebSocket } from "@/components/presenter/hooks/usePresenterWebSocket";
import { CueFeedPanel } from "@/components/presenter/panels/CueFeedPanel";
import { DEFAULT_ROOM_ID } from "@/lib/models/Room";
import { cn } from "@/lib/utils";

function RegieInternalChatViewContent() {
  const {
    connected,
    messages,
    pinnedMessages,
    sendAction,
    clearHistory,
  } = usePresenterWebSocket(DEFAULT_ROOM_ID, "control");

  return (
    <div className="h-full flex flex-col">
      {/* Header with connection status */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">Internal Chat</span>
          <span className="text-xs text-muted-foreground">
            ({messages.length} messages)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              connected ? "text-green-500" : "text-muted-foreground"
            )}
          >
            {connected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {connected ? "Live" : "Offline"}
          </div>
          {/* Clear button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            title="Clear history"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-hidden">
        <CueFeedPanel
          messages={messages}
          pinnedMessages={pinnedMessages}
          onAction={sendAction}
          isPresenter={false}
        />
      </div>
    </div>
  );
}

export function RegieInternalChatViewPanel(props: IDockviewPanelProps) {
  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <RegieInternalChatViewContent />
    </div>
  );
}
