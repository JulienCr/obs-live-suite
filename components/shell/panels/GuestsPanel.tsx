import { type IDockviewPanelProps } from "dockview-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiGet, apiPost } from "@/lib/utils/ClientFetch";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import type { LowerThirdEvent } from "@/lib/models/OverlayEvents";

const config: PanelConfig = { id: "guests", context: "dashboard" };

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
export function GuestsPanel(_props: IDockviewPanelProps) {
  const t = useTranslations("dashboard.guests");
  const tCommon = useTranslations("common");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle lower third events to track active guest
  const handleLowerThirdEvent = useCallback((data: LowerThirdEvent) => {
    // Clear any existing hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (data.type === "show" && data.payload?.contentType === "guest") {
      setActiveGuestId(data.payload.guestId || null);

      // Auto-hide after duration if specified
      if (data.payload.duration) {
        hideTimeoutRef.current = setTimeout(() => {
          setActiveGuestId(null);
          hideTimeoutRef.current = null;
        }, data.payload.duration * 1000);
      }
    } else if (data.type === "hide") {
      setActiveGuestId(null);
    }
  }, []);

  // Subscribe to lower third channel using the hook
  useWebSocketChannel<LowerThirdEvent>("lower", handleLowerThirdEvent, {
    logPrefix: "GuestsPanel",
  });

  // Clean up hide timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const data = await apiGet<{ guests: Guest[] }>("/api/assets/guests");
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

        await apiPost("/api/actions/lower/hide");

        setActiveGuestId(null);
        return;
      }

      await apiPost(`/api/actions/lower/guest/${guest.id}`, { duration: 8 });
    } catch (error) {
      console.error("Failed to show/hide lower third:", error);
    }
  };

  return (
    <BasePanelWrapper config={config}>
      {loading ? (
        <div className="text-sm text-muted-foreground">{tCommon("loading")}</div>
      ) : guests.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          {t("noGuests")}
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
                title={t("showLowerThirdTooltip", { name: guest.displayName, shortcut: index === 9 ? '0' : index + 1 })}
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
    </BasePanelWrapper>
  );
}
