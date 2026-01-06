"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { VdoNinjaPanel } from "./panels/VdoNinjaPanel";
import { CueFeedPanel } from "./panels/CueFeedPanel";
import { QuickReplyPanel } from "./panels/QuickReplyPanel";
import { StreamerbotChatPanel } from "./panels/StreamerbotChatPanel";
import { usePresenterWebSocket } from "./hooks/usePresenterWebSocket";
import { useOverlayState } from "./hooks/useOverlayState";
import { Wifi, WifiOff, Users, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";
import { Button } from "@/components/ui/button";
import type { Room } from "@/lib/models/Room";
import { DEFAULT_ROOM_ID } from "@/lib/models/Room";
import { useToast } from "@/hooks/use-toast";
import { usePwaStandalone } from "@/hooks/use-pwa-standalone";
import type { CueMessage } from "@/lib/models/Cue";

export function PresenterShell() {
  const t = useTranslations("presenter");
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room") || DEFAULT_ROOM_ID;
  const role = (searchParams.get("role") as "presenter" | "control" | "producer") || "presenter";

  const [roomConfig, setRoomConfig] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  // Default quick replies with translations
  const DEFAULT_QUICK_REPLIES = [
    t("quickReplies.ready"),
    t("quickReplies.needMoreContext"),
    t("quickReplies.delay1min"),
    t("quickReplies.audioIssue"),
  ];

  const {
    connected,
    messages,
    pinnedMessages,
    presence,
    sendAction,
    sendReply,
    clearHistory,
  } = usePresenterWebSocket(roomId, role);

  const overlayState = useOverlayState();
  const { toast } = useToast();
  const { isStandalone } = usePwaStandalone();

  const [showingInOverlayId, setShowingInOverlayId] = useState<string | null>(null);
  const [currentlyDisplayedId, setCurrentlyDisplayedId] = useState<string | null>(null);

  const handleClearHistory = async () => {
    await clearHistory();
  };

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
      await apiPost(
        "/api/overlays/chat-highlight",
        action === "show"
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
          : { action: "hide" }
      );

      if (action === "show") {
        setCurrentlyDisplayedId(message.id);
        toast({
          title: t("overlay.showingInOverlay"),
          description: t("overlay.messageFrom", { author: payload.author }),
        });

        // Auto-clear the displayed ID after duration
        setTimeout(() => {
          setCurrentlyDisplayedId((prev) => (prev === message.id ? null : prev));
        }, 10000);
      } else {
        setCurrentlyDisplayedId(null);
      }
    } catch (error) {
      const errorMessage = isClientFetchError(error) ? error.errorMessage : String(error);
      console.error("Failed to update overlay:", errorMessage);
      toast({
        title: t("status.error"),
        description: t("overlay.failedToUpdate"),
        variant: "destructive",
      });
    } finally {
      setShowingInOverlayId(null);
    }
  }, [showingInOverlayId, currentlyDisplayedId, toast, t]);

  // Fetch room configuration
  useEffect(() => {
    async function fetchRoom() {
      try {
        const data = await apiGet<{ room: Room }>(`/api/presenter/rooms/${roomId}`);
        setRoomConfig(data.room);
      } catch (error) {
        // 404 is expected for non-existent rooms, only log unexpected errors
        if (!isClientFetchError(error) || error.status !== 404) {
          console.error("Failed to fetch room:", error);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchRoom();
  }, [roomId]);

  const quickReplies = roomConfig?.quickReplies || DEFAULT_QUICK_REPLIES;
  const vdoNinjaUrl = roomConfig?.vdoNinjaUrl;

  const presenterOnline = presence.some(p => p.role === "presenter" && p.isOnline);
  const controlOnline = presence.some(p => p.role === "control" && p.isOnline);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">{t("status.loadingRoom")}</div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-screen flex flex-col bg-background",
      isStandalone && "pwa-safe-top pwa-safe-bottom"
    )}>
      {/* Status Bar */}
      <div className="flex-shrink-0 h-10 border-b flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {roomConfig?.name || `Room: ${roomId}`}
          </span>
          <span className="text-xs text-muted-foreground">
            ({role})
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Clear History Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="h-7 text-xs"
            title={t("actions.clearHistory")}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {t("actions.clear")}
          </Button>
          {/* Connection status */}
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">
              {connected ? t("status.connected") : t("status.disconnected")}
            </span>
          </div>
          {/* Presence indicators */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              <span className={cn(
                "h-2 w-2 rounded-full",
                presenterOnline ? "bg-green-500" : "bg-gray-400"
              )} title={t("labels.presenter")} />
              <span className={cn(
                "h-2 w-2 rounded-full",
                controlOnline ? "bg-blue-500" : "bg-gray-400"
              )} title={t("labels.controlRoom")} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane - Video + Cues */}
        <div className="flex-1 flex flex-col md:w-1/2 lg:w-2/3 min-h-0">
          {/* Video (hidden on mobile) */}
          <div className="hidden md:block h-1/2 border-b min-h-0">
            <VdoNinjaPanel url={vdoNinjaUrl} />
          </div>

          {/* Cue Feed */}
          <div className="flex-1 overflow-hidden min-h-0">
            <CueFeedPanel
              messages={messages}
              pinnedMessages={pinnedMessages}
              onAction={sendAction}
              isPresenter={role === "presenter"}
              overlayState={overlayState}
              onShowInOverlay={handleShowInOverlay}
              showingInOverlayId={showingInOverlayId}
              currentlyDisplayedId={currentlyDisplayedId}
            />
          </div>

          {/* Quick Reply */}
          <div className="flex-shrink-0 border-t">
            <QuickReplyPanel
              quickReplies={quickReplies}
              onSend={sendReply}
              canSendCustomMessages={roomConfig?.canSendCustomMessages ?? true}
            />
          </div>
        </div>

        {/* Right Pane - Streamer.bot Chat */}
        <div className="h-1/2 md:h-full md:w-1/2 lg:w-1/3 border-t md:border-t-0 md:border-l min-h-0">
          <StreamerbotChatPanel
            connectionSettings={roomConfig?.streamerbotConnection}
            roomId={roomId}
            allowSendMessage={roomConfig?.allowPresenterToSendMessage}
          />
        </div>
      </div>
    </div>
  );
}
