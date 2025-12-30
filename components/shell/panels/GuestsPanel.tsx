import { type IDockviewPanelProps } from "dockview-react";
import { useEffect, useState, useRef } from "react";
import { Zap } from "lucide-react";
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

/**
 * Guests panel for Dockview - displays guests without Card wrapper
 */
export function GuestsPanel(props: IDockviewPanelProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchGuests();
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
            channel: "lower",
          }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.channel === "lower" && message.data) {
              const data = message.data;
              
              if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
              }
              
              if (data.type === "show" && data.payload?.contentType === "guest") {
                setActiveGuestId(data.payload.guestId || null);
                
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
            console.error("[GuestsPanel] Failed to parse WebSocket message:", error);
          }
        };

        ws.onerror = () => {};

        ws.onclose = () => {
          wsRef.current = null;
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };
      } catch (error) {
        console.error("[GuestsPanel] Failed to create WebSocket:", error);
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

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
      const allEnabledGuests = (data.guests || []).filter((g: Guest) => g.isEnabled);
      setGuests(allEnabledGuests.slice(0, 10));
    } catch (error) {
      console.error("Failed to fetch guests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLowerThird = async (guest: Guest) => {
    try {
      if (activeGuestId === guest.id) {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        
        await fetch("/api/actions/lower/hide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        setActiveGuestId(null);
        return;
      }
      
      await fetch(`/api/actions/lower/guest/${guest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: 8 }),
      });
    } catch (error) {
      console.error("Failed to show/hide lower third:", error);
    }
  };

  return (
    <div style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : guests.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          No guests yet. Add guests in Assets.
        </div>
      ) : (
        <div 
          className="grid grid-cols-2 gap-2"
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
                title={`Show ${guest.displayName} lower third (Shortcut: ${index === 9 ? '0' : index + 1})`}
              >
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
            );
          })}
        </div>
      )}
    </div>
  );
}
