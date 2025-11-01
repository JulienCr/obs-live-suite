"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff } from "lucide-react";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  isEnabled: boolean;
}

/**
 * PosterCard - Thumbnail gallery for quick poster triggering
 */
export function PosterCard() {
  const [activePoster, setActivePoster] = useState<string | null>(null);
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

  const handleTogglePoster = async (poster: Poster) => {
    // Toggle: if clicking the active poster, hide it
    if (activePoster === poster.id) {
      await handleHide();
      return;
    }

    try {
      const response = await fetch("/api/overlays/poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "show",
          payload: {
            posterId: poster.id,
            fileUrl: poster.fileUrl,
            transition: "fade"
          }
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to show poster");
      }

      setActivePoster(poster.id);
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
    } catch (error) {
      console.error("Error hiding poster:", error);
    }
  };

  return (
    <Card>
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
                <button
                  key={poster.id}
                  onClick={() => handleTogglePoster(poster)}
                  className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105 hover:shadow-lg ${
                    activePoster === poster.id
                      ? "border-green-500 ring-2 ring-green-500 ring-offset-2"
                      : "border-border hover:border-primary"
                  }`}
                  title={poster.title}
                >
                  <img
                    src={poster.fileUrl}
                    alt={poster.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Active indicator */}
                  {activePoster === poster.id && (
                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                      <Eye className="w-3 h-3 text-white" />
                    </div>
                  )}
                  
                  {/* Hover overlay with title */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                    <span className="text-white text-xs font-medium text-center line-clamp-2">
                      {poster.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

