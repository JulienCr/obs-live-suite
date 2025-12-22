"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  isEnabled: boolean;
}

interface PosterCardProps {
  size?: string;
  className?: string;
  settings?: Record<string, unknown>;
}

/**
 * PosterCard - Thumbnail gallery for quick poster triggering
 */
export function PosterCard({ size, className, settings }: PosterCardProps = {}) {
  const [activePoster, setActivePoster] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosters();
  }, []);

  const fetchPosters = async () => {
    try {
      const res = await fetch("/api/assets/posters");
      const data = await res.json();
      // Filter to show only enabled posters
      const enabledPosters = (data.posters || []).filter((p: Poster) => p.isEnabled);
      setPosters(enabledPosters);
    } catch (error) {
      console.error("Failed to fetch posters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePoster = async (poster: Poster, side: "left" | "right") => {
    // Hide if same poster + same side
    if (activePoster === poster.id && activeSide === side) {
      await handleHide();
      return;
    }

    // Show or move to selected side
    try {
      const response = await fetch("/api/overlays/poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "show",
          payload: {
            posterId: poster.id,
            fileUrl: poster.fileUrl,
            transition: "fade",
            side: side,
          }
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to show poster");
      }

      setActivePoster(poster.id);
      setActiveSide(side);
    } catch (error) {
      console.error("Error showing poster:", error);
    }
  };

  const handleHide = async () => {
    try {
      const response = await fetch("/api/overlays/poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide" }),
      });

      if (!response.ok) {
        throw new Error("Failed to hide poster");
      }

      setActivePoster(null);
      setActiveSide(null);
    } catch (error) {
      console.error("Error hiding poster:", error);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Posters
          <div
            className={`w-3 h-3 rounded-full ${
              activePoster ? "bg-green-500" : "bg-gray-300"
            }`}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : posters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No posters
          </div>
        ) : (
          <ScrollArea className="h-[500px] w-full">
            <div className="grid grid-cols-2 gap-2 pr-4">
              {posters.map((poster) => (
                <div
                  key={poster.id}
                  className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    activePoster === poster.id
                      ? "border-green-500 ring-2 ring-green-500 ring-offset-2"
                      : "border-border hover:border-primary"
                  }`}
                  title={poster.title}
                >
                  {/* Image */}
                  <img
                    src={poster.fileUrl}
                    alt={poster.title}
                    className="w-full h-full object-cover"
                  />

                  {/* LEFT half button */}
                  <button
                    onClick={() => handleTogglePoster(poster, "left")}
                    className="absolute top-0 bottom-0 left-0 w-1/2 hover:bg-blue-500/20 transition-colors border-r border-white/10"
                    aria-label={`Show ${poster.title} on left`}
                  />

                  {/* RIGHT half button */}
                  <button
                    onClick={() => handleTogglePoster(poster, "right")}
                    className="absolute top-0 bottom-0 right-0 w-1/2 hover:bg-blue-500/20 transition-colors border-l border-white/10"
                    aria-label={`Show ${poster.title} on right`}
                  />

                  {/* Active indicator with L/R badge */}
                  {activePoster === poster.id && (
                    <div className={`absolute top-1 ${activeSide === "left" ? "left-1" : "right-1"} flex items-center gap-1 bg-green-500 rounded-full px-2 py-1 pointer-events-none`}>
                      <Eye className="w-3 h-3 text-white" />
                      <span className="text-white text-[10px] font-semibold">
                        {activeSide === "left" ? "L" : "R"}
                      </span>
                    </div>
                  )}

                  {/* Hover overlay with title */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 pointer-events-none">
                    <span className="text-white text-xs font-medium text-center line-clamp-2">
                      {poster.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

