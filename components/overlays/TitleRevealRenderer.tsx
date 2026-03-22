"use client";

import { useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { loadGoogleFont } from "@/lib/titleReveal/fontLoader";
import { buildTimeline, destroyTimeline } from "@/lib/titleReveal/timeline";
import { animateDisappearStandalone } from "@/lib/titleReveal/disappearAnimation";
import { TITLE_REVEAL_DEFAULTS } from "@/lib/titleReveal/animationDefaults";
import type { TitleRevealAnimConfig } from "@/lib/titleReveal/types";
import type { TitleRevealEvent } from "@/lib/models/OverlayEvents";
import { OverlayChannel } from "@/lib/models/OverlayEvents";
import "@/components/overlays/title-reveal-styles.css";

const audioCache = new Map<string, HTMLAudioElement>();

function playSound(url: string) {
  try {
    let audio = audioCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      audioCache.set(url, audio);
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // Audio may fail in some browser source configs
  }
}

/**
 * TitleRevealRenderer manages WebSocket connection and GSAP animation
 * for full-screen title reveal overlays.
 */
export function TitleRevealRenderer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const charWrapsRef = useRef<HTMLElement[]>([]);
  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(() => {});

  const cleanup = useCallback(() => {
    if (timelineRef.current) {
      destroyTimeline(timelineRef.current);
      timelineRef.current = null;
    }
    // Kill orphaned wobble tweens (repeat: -1) that live outside the timeline
    charWrapsRef.current.forEach((wrap) => gsap.killTweensOf(wrap));
    charWrapsRef.current = [];
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
  }, []);

  const handleEvent = useCallback(async (data: TitleRevealEvent) => {
    switch (data.type) {
      case "play": {
        if (!data.payload || !containerRef.current) break;

        // Clean up any existing animation
        cleanup();

        // Play sound if configured
        if (data.payload.soundUrl) {
          playSound(data.payload.soundUrl);
        }

        const { lines, fontFamily, fontSize, rotation, colorText, colorGhostBlue, colorGhostNavy, duration } = data.payload;
        const config: TitleRevealAnimConfig = {
          lines,
          logoUrl: data.payload.logoUrl ?? null,
          fontFamily,
          fontSize,
          rotation,
          colorText,
          colorGhostBlue,
          colorGhostNavy,
          duration,
        };

        // Load font before animating
        await loadGoogleFont(config.fontFamily);

        const result = buildTimeline(containerRef.current, config);
        timelineRef.current = result.timeline;
        charWrapsRef.current = result.charWraps;

        // Auto-cleanup when timeline completes
        result.timeline.eventCallback("onComplete", () => {
          cleanup();
        });
        break;
      }

      case "hide": {
        if (timelineRef.current) {
          // Kill current timeline and play disappear animation
          timelineRef.current.kill();
          timelineRef.current = null;

          if (charWrapsRef.current.length > 0) {
            const disappearTl = animateDisappearStandalone(charWrapsRef.current, TITLE_REVEAL_DEFAULTS);
            disappearTl.eventCallback("onComplete", () => {
              cleanup();
            });
          } else {
            cleanup();
          }
        }
        break;
      }
    }

    sendAckRef.current(data.id);
  }, [cleanup]);

  const { sendAck } = useWebSocketChannel<TitleRevealEvent>(
    OverlayChannel.TITLE_REVEAL,
    handleEvent,
    { logPrefix: "TitleReveal" }
  );

  sendAckRef.current = sendAck;

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "1920px",
        height: "1080px",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
  );
}
