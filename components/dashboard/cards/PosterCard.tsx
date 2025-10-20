"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, Play, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * PosterCard - Control card for poster/image overlays
 */
export function PosterCard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // TODO: Load from API
  const posters = [
    { id: "1", title: "Show Poster", url: "/posters/example.jpg" },
  ];

  const handleTakeover = async () => {
    // TODO: Implement takeover via API
    console.log("Takeover poster:", posters[currentIndex]);
    setIsVisible(true);
  };

  const handleFade = async () => {
    // TODO: Implement fade out via API
    console.log("Fade poster");
    setIsVisible(false);
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
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          {posters.length > 0 ? (
            <Image className="w-12 h-12 text-muted-foreground" aria-label="Poster placeholder" />
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

