"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildTimeline,
  destroyTimeline,
  loadGoogleFont,
  type TitleRevealAnimConfig,
} from "@/lib/titleReveal";
import "@/components/overlays/title-reveal-styles.css";

interface TitleRevealPreviewProps {
  config: TitleRevealAnimConfig;
}

export function TitleRevealPreview({ config }: TitleRevealPreviewProps) {
  const t = useTranslations("dashboard.titleReveal");
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);

  // Load Google Font when fontFamily changes
  useEffect(() => {
    if (config.fontFamily) {
      loadGoogleFont(config.fontFamily).catch(() => {});
    }
  }, [config.fontFamily]);

  const handlePlayPreview = useCallback(() => {
    const el = containerRef.current;
    if (!el || isAnimatingRef.current) return;

    // Destroy previous timeline
    if (timelineRef.current) {
      destroyTimeline(timelineRef.current);
      timelineRef.current = null;
    }

    // Clear container
    el.innerHTML = "";

    isAnimatingRef.current = true;
    setIsAnimating(true);

    try {
      const result = buildTimeline(el, config);
      timelineRef.current = result.timeline;

      result.timeline.eventCallback("onComplete", () => {
        isAnimatingRef.current = false;
        setIsAnimating(false);
        timelineRef.current = null;
      });
    } catch (error) {
      console.error("Failed to build preview timeline:", error);
      isAnimatingRef.current = false;
      setIsAnimating(false);
    }
  }, [config]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        destroyTimeline(timelineRef.current);
        timelineRef.current = null;
      }
    };
  }, []);

  const hasContent = config.lines.length > 0 && config.lines.some((l) => l.text.trim());

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative w-full bg-black rounded overflow-hidden"
        style={{ aspectRatio: "16 / 9" }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handlePlayPreview}
        disabled={isAnimating || !hasContent}
      >
        <Play className="h-4 w-4 mr-1" />
        {t("playPreview")}
      </Button>
    </div>
  );
}
