"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Zap, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiPost } from "@/lib/utils/ClientFetch";
import { sendChatMessage } from "@/lib/utils/chatMessaging";
import { useGuests, useOverlaySettings, type Guest } from "@/lib/queries";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";

interface GuestsCardProps {
  className?: string;
}

export function GuestsCard({ className }: GuestsCardProps = {}) {
  const t = useTranslations("dashboard.guests");
  const tCommon = useTranslations("common");

  // Use React Query hook for guest data
  const { guests: allGuests, isLoading: loading } = useGuests({ enabled: true });
  const guests = allGuests.slice(0, 10); // Limit to 10 for keyboard shortcuts (1-0)
  const totalEnabledGuests = allGuests.length;

  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const { lowerThirdDuration } = useOverlaySettings();
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection to track active lower third
  const handleLowerMessage = useCallback((data: Record<string, unknown>) => {
    // Clear any existing hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Track when a guest lower third is shown or hidden
    const payload = data.payload as Record<string, unknown> | undefined;
    if (data.type === "show" && payload?.contentType === "guest") {
      setActiveGuestId((payload.guestId as string) || null);

      // If there's a duration, automatically clear the active state after that duration
      if (payload.duration) {
        hideTimeoutRef.current = setTimeout(() => {
          setActiveGuestId(null);
          hideTimeoutRef.current = null;
        }, (payload.duration as number) * 1000);
      }
    } else if (data.type === "hide") {
      setActiveGuestId(null);
    }
  }, []);

  useWebSocketChannel("lower", handleLowerMessage, {
    logPrefix: "GuestsCard",
  });

  const handleQuickLowerThird = async (guest: Guest) => {
    try {
      // If clicking on the currently active guest, hide it (panic button)
      if (activeGuestId === guest.id) {
        console.log("[GuestsCard] Hiding active guest (panic):", guest.id);

        // Clear the auto-hide timer
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }

        // Send hide event
        await apiPost("/api/actions/lower/hide");

        // Update state immediately
        setActiveGuestId(null);
        return;
      }

      console.log("[GuestsCard] Showing guest lower third with theme:", guest.id);

      // Use the same endpoint as Stream Deck plugin (has theme enrichment)
      await apiPost(`/api/actions/lower/guest/${guest.id}`, {
        duration: lowerThirdDuration,
      });
    } catch (error) {
      console.error("Failed to show/hide lower third:", error);
    }
  };

  const handleSendMessage = (e: React.MouseEvent, guest: Guest) => {
    e.stopPropagation();
    if (guest.chatMessage) {
      sendChatMessage(guest.chatMessage);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t("title")}
          </div>
          {totalEnabledGuests > 10 && (
            <span className="text-xs text-muted-foreground font-normal">
              10 / {totalEnabledGuests}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">{tCommon("loading")}</div>
        ) : guests.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            {t("noGuests")}
          </div>
        ) : (
          <div 
            className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-2"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "hsl(var(--muted)) transparent"
            }}
          >
            {guests.map((guest, index) => {
              const isActive = activeGuestId === guest.id;
              return (
              <div
                key={guest.id}
                className={cn(
                  "relative flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer group border-2",
                  isActive
                    ? "bg-muted/50 border-green-500"
                    : "border-transparent hover:bg-muted/50"
                )}
                onClick={() => handleQuickLowerThird(guest)}
                title={t("showLowerThirdTooltip", { name: guest.displayName, shortcut: index === 9 ? '0' : index + 1 })}
              >
                {/* Guest number badge */}
                <div className="w-5 h-5 rounded flex items-center justify-center bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {index === 9 ? '0' : index + 1}
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 overflow-hidden"
                  style={{ backgroundColor: guest.accentColor }}
                >
                  {guest.avatarUrl ? (
                    <img
                      src={guest.avatarUrl}
                      alt={guest.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    guest.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {guest.displayName}
                  </div>
                </div>

                {/* Message button - only show if guest has chatMessage */}
                {guest.chatMessage && (
                  <button
                    onClick={(e) => handleSendMessage(e, guest)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-6 w-6 flex items-center justify-center hover:bg-primary/20 rounded"
                    title={t("sendMessageTooltip", { name: guest.displayName })}
                  >
                    <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}

                {/* Active indicator with green Zap icon */}
                {isActive ? (
                  <div className="shrink-0 flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
                    <Zap className="w-3 h-3 text-white fill-white" />
                  </div>
                ) : (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-6 w-6 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

