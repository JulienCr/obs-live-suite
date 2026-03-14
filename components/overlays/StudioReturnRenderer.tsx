"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { StudioReturnDisplay, type StudioReturnContent } from "./StudioReturnDisplay";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { CueSeverity } from "@/lib/models/Cue";
import type { CountdownPayload } from "@/lib/models/Cue";
import { DEFAULT_STUDIO_RETURN_SETTINGS } from "@/lib/models/StudioReturn";
import { formatTimeShort } from "@/lib/utils/durationParser";

// ------------------------------------------------------------------
// Types mirroring the presenter channel payloads
// ------------------------------------------------------------------

interface CuePayload {
  type: string;
  severity?: CueSeverity;
  title?: string;
  body?: string;
  studioReturn?: boolean;
  studioReturnDismiss?: boolean;
  countdownPayload?: CountdownPayload;
}

interface PresenterMessage {
  type: string;
  payload: CuePayload;
}

interface StudioReturnSettings {
  displayDuration?: number | null;
  fontSize?: number | null;
  enabled?: boolean | null;
  monitorIndex?: number | null;
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export function StudioReturnRenderer() {
  const [content, setContent] = useState<StudioReturnContent | null>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_STUDIO_RETURN_SETTINGS.fontSize);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [debugVisible, setDebugVisible] = useState(false);

  const enabledRef = useRef(true);
  const displayDurationRef = useRef(DEFAULT_STUDIO_RETURN_SETTINGS.displayDuration);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const countdownIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const debugVisibleRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { debugVisibleRef.current = debugVisible; }, [debugVisible]);

  // --- Debug logging ---
  const debugLog = useCallback((msg: string) => {
    console.log(`[StudioReturn] ${msg}`);
    if (!debugVisibleRef.current) return;
    setDebugLines((prev) => {
      const line = `${new Date().toLocaleTimeString()} ${msg}`;
      const next = [line, ...prev];
      if (next.length > 20) next.length = 20;
      return next;
    });
  }, []);

  // --- Timer helpers ---
  const clearAllTimers = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = undefined;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = undefined;
    }
  }, []);

  const hide = useCallback(() => {
    clearAllTimers();
    setContent(null);
  }, [clearAllTimers]);

  const scheduleFadeOut = useCallback(
    (durationSec: number) => {
      dismissTimeoutRef.current = setTimeout(() => {
        setContent(null);
      }, durationSec * 1000);
    },
    [],
  );

  // --- Countdown logic ---
  const startCountdown = useCallback(
    (payload: CuePayload) => {
      clearAllTimers();

      const cp = payload.countdownPayload!;
      let remaining: number;

      if (cp.mode === "targetTime" && cp.targetTime) {
        remaining = Math.max(
          0,
          Math.round((new Date(cp.targetTime).getTime() - Date.now()) / 1000),
        );
      } else {
        remaining = cp.durationSec ?? 60;
      }

      setContent({
        title: payload.title || "COUNTDOWN",
        body: formatTimeShort(remaining, true),
        severity: CueSeverity.WARN,
        type: "countdown",
      });

      countdownIntervalRef.current = setInterval(() => {
        remaining--;

        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = undefined;
          setContent({
            title: payload.title || "COUNTDOWN",
            body: "0:00",
            severity: CueSeverity.URGENT,
            type: "countdown",
          });
          // Auto-dismiss after 3s
          dismissTimeoutRef.current = setTimeout(() => setContent(null), 3000);
          return;
        }

        setContent((prev) => ({
          title: prev?.title || "COUNTDOWN",
          body: formatTimeShort(remaining, true),
          severity: remaining <= 10 ? CueSeverity.URGENT : CueSeverity.WARN,
          type: "countdown",
        }));
      }, 1000);
    },
    [clearAllTimers],
  );

  // --- Settings bridge for Tauri ---
  const applySettings = useCallback(
    (settings: StudioReturnSettings) => {
      debugLog(`Settings received: ${JSON.stringify(settings)}`);

      if (settings.displayDuration != null) {
        displayDurationRef.current = settings.displayDuration;
      }
      if (settings.fontSize != null) {
        setFontSize(settings.fontSize);
      }
      if (settings.enabled != null) {
        enabledRef.current = settings.enabled;
        if (!settings.enabled) hide();
      }
    },
    [debugLog, hide],
  );

  // --- Expose Tauri bridges on window (stable via refs) ---
  const applySettingsRef = useRef(applySettings);
  applySettingsRef.current = applySettings;
  const hideRef = useRef(hide);
  hideRef.current = hide;

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__applySettings = (settings: StudioReturnSettings) => {
      applySettingsRef.current(settings);
    };

    (window as unknown as Record<string, unknown>).__studioReturnDismiss = () => {
      hideRef.current();
    };

    // Check for Tauri debug flag
    if ((window as unknown as Record<string, unknown>).__DEBUG__) {
      setDebugVisible(true);
    }

    return () => {
      delete (window as unknown as Record<string, unknown>).__applySettings;
      delete (window as unknown as Record<string, unknown>).__studioReturnDismiss;
    };
  }, []);

  // --- WebSocket message handler ---
  const handleMessage = useCallback(
    (data: PresenterMessage) => {
      // Handle real-time settings updates from dashboard
      if (data.type === "studio-return-settings") {
        const settings = data.payload as unknown as StudioReturnSettings;
        applySettings(settings);

        // Reposition window via Tauri command if available
        if (
          settings.monitorIndex != null &&
          (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
        ) {
          const tauri = (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ as {
            invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
          };
          tauri.invoke("reposition_monitor", { monitorIndex: settings.monitorIndex });
        }
        return;
      }

      if (data.type !== "message") return;

      const payload = data.payload;
      if (!payload || payload.type === "clear") return;
      if (!payload.studioReturn) return;

      // Dismiss signal
      if (payload.studioReturnDismiss) {
        debugLog("Dismiss received — hiding overlay");
        hide();
        return;
      }

      if (!enabledRef.current) return;

      // Countdown
      if (payload.type === "countdown" && payload.countdownPayload) {
        debugLog(`Countdown: ${JSON.stringify(payload.countdownPayload)}`);
        startCountdown(payload);
        return;
      }

      // Regular notification
      debugLog(`Notification: severity=${payload.severity || "info"} title=${payload.title || ""}`);
      clearAllTimers();
      setContent({
        title: payload.title || "",
        body: payload.body || "",
        severity: payload.severity || CueSeverity.INFO,
        type: "notification",
      });
      scheduleFadeOut(displayDurationRef.current);
    },
    [applySettings, clearAllTimers, debugLog, hide, scheduleFadeOut, startCountdown],
  );

  useWebSocketChannel<PresenterMessage>("presenter", handleMessage, {
    logPrefix: "StudioReturn",
  });

  return (
    <>
      <AnimatePresence>
        {content && (
          <StudioReturnDisplay
            key="studio-return-content"
            title={content.title}
            body={content.body}
            severity={content.severity}
            fontSize={fontSize}
          />
        )}
      </AnimatePresence>

      {/* Debug overlay — same as the Vite version */}
      {debugVisible && debugLines.length > 0 && (
        <pre
          style={{
            position: "fixed",
            bottom: 8,
            left: 8,
            color: "#0f0",
            fontSize: 11,
            fontFamily: "monospace",
            background: "rgba(0,0,0,0.7)",
            padding: 8,
            borderRadius: 4,
            maxWidth: 600,
            maxHeight: 200,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          {debugLines.join("\n")}
        </pre>
      )}
    </>
  );
}
