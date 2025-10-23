"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Zap } from "lucide-react";

interface Guest {
  id: string;
  displayName: string;
  subtitle?: string;
  accentColor: string;
  avatarUrl?: string;
}

/**
 * GuestsCard displays guests with quick lower third buttons
 */
export function GuestsCard() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const res = await fetch("/api/assets/guests");
      const data = await res.json();
      setGuests(data.guests || []);
    } catch (error) {
      console.error("Failed to fetch guests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLowerThird = async (guest: Guest) => {
    try {
      console.log("[GuestsCard] Showing guest lower third with theme:", guest.id);
      
      // Use the same endpoint as Stream Deck plugin (has theme enrichment)
      await fetch(`/api/actions/lower/guest/${guest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: 8, // Auto-hide after 8 seconds
        }),
      });
    } catch (error) {
      console.error("Failed to show lower third:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Quick Guests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : guests.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No guests yet. Add guests in Assets.
          </div>
        ) : (
          <div 
            className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-2"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "hsl(var(--muted)) transparent"
            }}
          >
            {guests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => handleQuickLowerThird(guest)}
                title={`Show ${guest.displayName} lower third`}
              >
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickLowerThird(guest);
                  }}
                  title="Show Lower Third (8s)"
                >
                  <Zap className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

