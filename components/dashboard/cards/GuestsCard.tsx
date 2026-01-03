"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getWebSocketUrl } from "@/lib/utils/websocket";

interface Guest {
  id: string;
  displayName: string;
  subtitle?: string;
  accentColor: string;
  avatarUrl?: string;
  isEnabled: boolean;
}

interface GuestsCardProps {
  size?: string;
  className?: string;
  settings?: Record<string, unknown>;
}

/**
 * GuestsCard displays guests with quick lower third buttons
 */
export function GuestsCard({ size, className, settings }: GuestsCardProps = {}) {
  const t = useTranslations("dashboard.guests");
  const tCommon = useTranslations("common");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEnabledGuests, setTotalEnabledGuests] = useState(0);
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const [lowerThirdDuration, setLowerThirdDuration] = useState(8); // Default, will be updated from settings
  const wsRef = useRef<WebSocket | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchGuests();
    // Fetch overlay settings
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings/overlay");
        const data = await res.json();
        if (data.settings?.lowerThirdDuration) {
          setLowerThirdDuration(data.settings.lowerThirdDuration);
        }
      } catch (error) {
        console.error("Failed to fetch overlay settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // WebSocket connection to track active lower third
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      try {
        const ws = new WebSocket(getWebSocketUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: "subscribe",
            channel: "lower", // Channel name is "lower", not "lower-third"
          }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.channel === "lower" && message.data) {
              const data = message.data;
              
              // Clear any existing hide timeout
              if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
              }
              
              // Track when a guest lower third is shown or hidden
              if (data.type === "show" && data.payload?.contentType === "guest") {
                setActiveGuestId(data.payload.guestId || null);
                
                // If there's a duration, automatically clear the active state after that duration
                if (data.payload.duration) {
                  hideTimeoutRef.current = setTimeout(() => {
                    setActiveGuestId(null);
                    hideTimeoutRef.current = null;
                  }, data.payload.duration * 1000);
                }
              } else if (data.type === "hide") {
                setActiveGuestId(null);
              }
            }
          } catch (error) {
            console.error("[GuestsCard] Failed to parse WebSocket message:", error);
          }
        };

        ws.onerror = () => {
          // Silently handle error, will reconnect on close
        };

        ws.onclose = () => {
          wsRef.current = null;
          // Reconnect after 3 seconds if not unmounted
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };
      } catch (error) {
        console.error("[GuestsCard] Failed to create WebSocket:", error);
        // Retry connection after 3 seconds
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    // Initial connection with a small delay to let backend start
    const initialTimeout = setTimeout(connectWebSocket, 500);

    return () => {
      isUnmounted = true;
      clearTimeout(initialTimeout);
      clearTimeout(reconnectTimeout);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const fetchGuests = async () => {
    try {
      const res = await fetch("/api/assets/guests");
      const data = await res.json();
      // Filter to show only enabled guests
      const allEnabledGuests = (data.guests || []).filter((g: Guest) => g.isEnabled);
      setTotalEnabledGuests(allEnabledGuests.length);
      // Limit to 10 for keyboard shortcuts (1-0)
      setGuests(allEnabledGuests.slice(0, 10));
    } catch (error) {
      console.error("Failed to fetch guests:", error);
    } finally {
      setLoading(false);
    }
  };

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
        await fetch("/api/actions/lower/hide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        // Update state immediately
        setActiveGuestId(null);
        return;
      }
      
      console.log("[GuestsCard] Showing guest lower third with theme:", guest.id);
      
      // Use the same endpoint as Stream Deck plugin (has theme enrichment)
      await fetch(`/api/actions/lower/guest/${guest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: lowerThirdDuration,
        }),
      });
    } catch (error) {
      console.error("Failed to show/hide lower third:", error);
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
                <div className="w-5 h-5 rounded flex items-center justify-center bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                  {index === 9 ? '0' : index + 1}
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 overflow-hidden"
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
                
                {/* Active indicator with green Zap icon */}
                {isActive ? (
                  <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
                    <Zap className="w-3 h-3 text-white fill-white" />
                  </div>
                ) : (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-6 w-6 flex items-center justify-center">
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

