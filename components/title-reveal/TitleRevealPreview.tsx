"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildTimeline,
  buildOnionSkinDOM,
  destroyTimeline,
  loadGoogleFont,
  type TitleRevealAnimConfig,
} from "@/lib/titleReveal";
import { TITLE_REVEAL } from "@/lib/config/Constants";
import "@/components/overlays/title-reveal-styles.css";

/** The stage renders at native overlay resolution, then CSS-scales to fit. */
const NATIVE_W = 1920;
const NATIVE_H = 1080;

interface TitleRevealPreviewProps {
  config: TitleRevealAnimConfig;
}

/**
 * Build a static DOM snapshot of the title reveal (no animation).
 * Shows the text as it would appear at rest — useful for editing.
 */
function buildStaticPreview(container: HTMLElement, config: TitleRevealAnimConfig) {
  container.innerHTML = "";

  const stage = document.createElement("div");
  stage.className = "title-reveal-stage";

  const logoSrc = config.logoUrl ?? TITLE_REVEAL.DEFAULT_LOGO_URL;
  const logoImg = document.createElement("img");
  logoImg.className = "title-reveal-logo";
  logoImg.src = logoSrc;
  logoImg.style.opacity = "0";
  logoImg.style.transform = "scale(0.02) rotate(10deg)";
  stage.appendChild(logoImg);

  const titleDiv = document.createElement("div");
  titleDiv.className = "title-reveal-title";
  titleDiv.style.fontFamily = `"${config.fontFamily}", cursive`;
  titleDiv.style.fontSize = `${config.fontSize}px`;
  titleDiv.style.color = config.colorText;
  titleDiv.style.transform = `rotate(${config.rotation}deg)`;
  stage.appendChild(titleDiv);

  container.appendChild(stage);

  // Build the onion-skin char DOM — ghosts hidden, main chars visible
  const charWraps = buildOnionSkinDOM(titleDiv, config);
  for (const wrap of charWraps) {
    const ghosts = wrap.querySelectorAll<HTMLElement>(".ghost");
    for (const g of ghosts) g.style.opacity = "0";
  }
}

export function TitleRevealPreview({ config }: TitleRevealPreviewProps) {
  const t = useTranslations("dashboard.titleReveal");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);
  const [scale, setScale] = useState(1);

  // Compute scale factor so the 1920×1080 stage fits the wrapper
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setScale(w / NATIVE_W);
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  // Load Google Font when fontFamily changes
  useEffect(() => {
    if (config.fontFamily) {
      loadGoogleFont(config.fontFamily).catch(() => {});
    }
  }, [config.fontFamily]);

  // Build static preview whenever config changes (and not animating)
  useEffect(() => {
    const el = stageRef.current;
    if (!el || isAnimatingRef.current) return;
    buildStaticPreview(el, config);
  }, [config]);

  const handlePlayPreview = useCallback(() => {
    const el = stageRef.current;
    if (!el || isAnimatingRef.current) return;

    // Destroy previous timeline
    if (timelineRef.current) {
      destroyTimeline(timelineRef.current);
      timelineRef.current = null;
    }

    // Clear container for animation
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
        // Restore static preview after animation ends
        buildStaticPreview(el, config);
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
      {/* Outer wrapper: responsive 16:9 box that clips overflow */}
      <div
        ref={wrapperRef}
        className="relative w-full bg-black rounded overflow-hidden"
        style={{ aspectRatio: "16 / 9" }}
      >
        {/* Inner stage: rendered at native 1920×1080, then CSS-scaled to fit */}
        <div
          ref={stageRef}
          className="absolute top-0 left-0"
          style={{
            width: NATIVE_W,
            height: NATIVE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
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
