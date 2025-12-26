"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Timer } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PosterQuickAdd } from "@/components/assets/PosterQuickAdd";

interface LowerThirdCardProps {
  size?: string;
  className?: string;
  settings?: Record<string, unknown>;
}

/**
 * LowerThirdCard - Control card for lower third overlays
 */
export function LowerThirdCard({ size, className, settings }: LowerThirdCardProps = {}) {
  const [mode, setMode] = useState<"guest" | "text">("guest");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const [side, setSide] = useState<"left" | "right" | "center">("left");
  const [isVisible, setIsVisible] = useState(false);

  const handleShow = async () => {
    try {
      const payload =
        mode === "text"
          ? {
              contentType: "text",
              body: markdown,
              imageUrl: imageUrl || undefined,
              imageAlt: imageAlt || undefined,
              side,
            }
          : {
              contentType: "guest",
              title,
              subtitle,
              side,
            };

      const response = await fetch("/api/actions/lower/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      const payload =
        mode === "text"
          ? {
              contentType: "text",
              body: markdown,
              imageUrl: imageUrl || undefined,
              imageAlt: imageAlt || undefined,
              side,
              duration: 5,
            }
          : {
              contentType: "guest",
              title,
              subtitle,
              side,
              duration: 5,
            };

      const response = await fetch("/api/actions/lower/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <Card className={cn(className)}>
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
        <div className="flex gap-2">
          <Button
            variant={mode === "guest" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("guest")}
            className="flex-1"
          >
            Guest
          </Button>
          <Button
            variant={mode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("text")}
            className="flex-1"
          >
            Text
          </Button>
        </div>

        {mode === "guest" ? (
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter name..."
          />
        </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="markdown">Markdown</Label>
            <textarea
              id="markdown"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Write your lower third copy (Markdown supported)"
              className="min-h-[120px] w-full rounded border border-input bg-background px-2.5 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">
              Markdown supported: bold, italic, lists, and line breaks.
            </p>
          </div>
        )}

        {mode === "guest" && (
          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Enter role..."
            />
          </div>
        )}

        {mode === "text" && (
          <div className="space-y-2">
            <Label>Image (optional)</Label>
            <PosterQuickAdd
              mode="picker"
              allowedTypes={["image"]}
              title="Quick Add Image"
              showTitleEditor={false}
              onMediaSelected={(media) => {
                setImageUrl(media.fileUrl);
                setImageAlt(media.title || "");
              }}
            />
            {imageUrl && (
              <div className="flex items-center gap-3 rounded border border-input bg-muted/50 p-2">
                <img
                  src={imageUrl}
                  alt={imageAlt || "Lower third image"}
                  className="h-16 w-28 rounded object-cover"
                />
                <div className="flex-1 text-xs text-muted-foreground">
                  {imageAlt || "Selected image"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImageUrl(null);
                    setImageAlt("");
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}

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
          <Button
            variant={side === "center" ? "default" : "outline"}
            size="sm"
            onClick={() => setSide("center")}
            className="flex-1"
          >
            Center
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleShow}
            disabled={mode === "guest" ? !title || isVisible : !markdown.trim() || isVisible}
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
            disabled={mode === "guest" ? !title : !markdown.trim()}
          >
            <Timer className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
