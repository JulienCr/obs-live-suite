"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
}

/**
 * PosterCard - Control card for poster/image overlays
 */
export function PosterCard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosters();
  }, []);

  const fetchPosters = async () => {
    try {
      const res = await fetch("/api/assets/posters");
      const data = await res.json();
      setPosters(data.posters || []);
    } catch (error) {
      console.error("Failed to fetch posters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeover = async () => {
    try {
      const poster = posters[currentIndex];
      
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

      setIsVisible(true);
    } catch (error) {
      console.error("Error showing poster:", error);
    }
  };

  const handleFade = async () => {
    try {
      const response = await fetch("/api/overlays/poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide" }),
      });

      if (!response.ok) {
        throw new Error("Failed to hide poster");
      }

      setIsVisible(false);
    } catch (error) {
      console.error("Error hiding poster:", error);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + posters.length) % posters.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % posters.length);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Poster
          <div
            className={`w-3 h-3 rounded-full ${
              isVisible ? "bg-green-500" : "bg-gray-300"
            }`}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : posters.length > 0 ? (
            <img
              src={posters[currentIndex].fileUrl}
              alt={posters[currentIndex].title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-sm text-muted-foreground">No posters</div>
          )}
        </div>

        {posters.length > 0 && (
          <>
            <div className="text-sm text-center font-medium">
              {posters[currentIndex].title}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={posters.length <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleTakeover}
                disabled={isVisible}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                Take Over
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={posters.length <= 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleFade}
              disabled={!isVisible}
              className="w-full"
            >
              Fade Out
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

