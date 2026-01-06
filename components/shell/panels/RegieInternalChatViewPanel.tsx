"use client";

import { useState, useCallback } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { MessageSquare, Wifi, WifiOff, Trash2 } from "lucide-react";
import { PanelColorMenu } from "../PanelColorMenu";
import { Button } from "@/components/ui/button";
import { usePresenterWebSocket } from "@/components/presenter/hooks/usePresenterWebSocket";
import { CueFeedPanel } from "@/components/presenter/panels/CueFeedPanel";
import { DEFAULT_ROOM_ID } from "@/lib/models/Room";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { CueMessage } from "@/lib/models/Cue";
import { apiPost } from "@/lib/utils/ClientFetch";

function RegieInternalChatViewContent() {
  const { toast } = useToast();
  const {
    connected,
    messages,
    pinnedMessages,
    sendAction,
    clearHistory,
  } = usePresenterWebSocket(DEFAULT_ROOM_ID, "control");

  const [showingInOverlayId, setShowingInOverlayId] = useState<string | null>(null);
  const [currentlyDisplayedId, setCurrentlyDisplayedId] = useState<string | null>(null);

  // Show/hide in overlay handler - toggle display of chat highlight overlay
  const handleShowInOverlay = useCallback(async (message: CueMessage) => {
    if (showingInOverlayId) return;
    if (!message.questionPayload) return;

    // Toggle: if already displayed, hide it
    const isCurrentlyDisplayed = currentlyDisplayedId === message.id;
    const action = isCurrentlyDisplayed ? "hide" : "show";

    setShowingInOverlayId(message.id);
    try {
      const payload = message.questionPayload;
      const overlayPayload = action === "show"
        ? {
            action: "show",
            payload: {
              messageId: message.id,
              platform: payload.platform || "twitch",
              username: payload.author?.toLowerCase() || "",
              displayName: payload.author || "",
              message: payload.text || "",
              parts: payload.parts,
              metadata: {
                color: payload.color,
                badges: payload.badges,
              },
              duration: 10,
            },
          }
        : { action: "hide" };

      await apiPost("/api/overlays/chat-highlight", overlayPayload);

      if (action === "show") {
        setCurrentlyDisplayedId(message.id);
        toast({
          title: "Showing in overlay",
          description: `Message from ${payload.author}`,
        });

        // Auto-clear the displayed ID after duration
        setTimeout(() => {
          setCurrentlyDisplayedId((prev) => (prev === message.id ? null : prev));
        }, 10000);
      } else {
        setCurrentlyDisplayedId(null);
      }
    } catch (error) {
      console.error("Failed to update overlay:", error);
      toast({
        title: "Error",
        description: "Failed to update overlay",
        variant: "destructive",
      });
    } finally {
      setShowingInOverlayId(null);
    }
  }, [showingInOverlayId, currentlyDisplayedId, toast]);

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
          onShowInOverlay={handleShowInOverlay}
          showingInOverlayId={showingInOverlayId}
          currentlyDisplayedId={currentlyDisplayedId}
        />
      </div>
    </div>
  );
}

export function RegieInternalChatViewPanel(props: IDockviewPanelProps) {
  return (
    <PanelColorMenu panelId="regieInternalChatView">
      <div data-panel-id="regieInternalChatView" style={{ height: "100%", overflow: "hidden" }}>
        <RegieInternalChatViewContent />
      </div>
    </PanelColorMenu>
  );
}
