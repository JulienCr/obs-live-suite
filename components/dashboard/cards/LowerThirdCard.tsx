"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Timer } from "lucide-react";

/**
 * LowerThirdCard - Control card for lower third overlays
 */
export function LowerThirdCard() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [side, setSide] = useState<"left" | "right">("left");
  const [isVisible, setIsVisible] = useState(false);

  const handleShow = async () => {
    try {
      const response = await fetch("/api/actions/lower/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, side }),
      });

      if (!response.ok) {
        throw new Error("Failed to show lower third");
      }

      setIsVisible(true);
    } catch (error) {
      console.error("Error showing lower third:", error);
    }
  };

  const handleHide = async () => {
    try {
      const response = await fetch("/api/actions/lower/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to hide lower third");
      }

      setIsVisible(false);
    } catch (error) {
      console.error("Error hiding lower third:", error);
    }
  };

  const handleAuto = async () => {
    try {
      const response = await fetch("/api/actions/lower/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          subtitle, 
          side, 
          duration: 5 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to show lower third");
      }

      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000);
    } catch (error) {
      console.error("Error showing lower third:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Lower Third
          <div
            className={`w-3 h-3 rounded-full ${
              isVisible ? "bg-green-500" : "bg-gray-300"
            }`}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter name..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input
            id="subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Enter role..."
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={side === "left" ? "default" : "outline"}
            size="sm"
            onClick={() => setSide("left")}
            className="flex-1"
          >
            Left
          </Button>
          <Button
            variant={side === "right" ? "default" : "outline"}
            size="sm"
            onClick={() => setSide("right")}
            className="flex-1"
          >
            Right
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleShow}
            disabled={!title || isVisible}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Show
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleHide}
            disabled={!isVisible}
            className="flex-1"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Hide
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAuto}
            disabled={!title}
          >
            <Timer className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

