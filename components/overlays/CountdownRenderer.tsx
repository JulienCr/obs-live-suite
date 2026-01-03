"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { CountdownDisplay } from "./CountdownDisplay";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import "./countdown.css";

interface ThemeData {
  colors: {
    primary: string;
    accent: string;
    surface: string;
    text: string;
    success: string;
    warn: string;
  };
  style: string;
  font: {
    family: string;
    size: number;
    weight: number;
  };
  layout?: {
    x: number;
    y: number;
    scale: number;
  };
}

interface CountdownState {
  visible: boolean;
  seconds: number;
  isRunning: boolean;
  style: "bold" | "corner" | "banner";
  position?: { x: number; y: number };
  format?: "mm:ss" | "hh:mm:ss" | "seconds";
  size?: { scale: number };
  theme?: Partial<ThemeData> & {
    color?: string;
    shadow?: boolean;
  };
}

interface CountdownEvent {
  type: string;
  payload?: {
    seconds?: number;
    style?: string;
    position?: { x: number; y: number };
    format?: "mm:ss" | "hh:mm:ss" | "seconds";
    size?: { scale: number };
    theme?: Partial<ThemeData> & {
      color?: string;
      shadow?: boolean;
    };
  };
  id: string;
}

/**
 * CountdownRenderer displays countdown timers
 */
export function CountdownRenderer() {
  const [state, setState] = useState<CountdownState>({
    visible: false,
    seconds: 0,
    isRunning: false,
    style: "bold",
  });

  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(() => {});

  const handleMessage = useCallback((data: CountdownEvent) => {
    switch (data.type) {
      case "set":
        const themeStyle = data.payload?.style || data.payload?.theme?.style || "bold";
        setState((prev) => ({
          ...prev,
          seconds: data.payload?.seconds ?? 0,
          visible: true,
          style: themeStyle as "bold" | "corner" | "banner",
          position: data.payload?.position,
          format: data.payload?.format || "mm:ss",
          size: data.payload?.size,
          theme: {
            ...data.payload?.theme,
            color: data.payload?.theme?.color,
            shadow: data.payload?.theme?.shadow,
          },
        }));
        break;
      case "start":
        setState((prev) => ({ ...prev, isRunning: true }));
        break;
      case "pause":
        setState((prev) => ({ ...prev, isRunning: false }));
        break;
      case "reset":
        setState((prev) => ({
          ...prev,
          seconds: 0,
          isRunning: false,
          visible: false,
        }));
        break;
      case "update":
        const updateThemeStyle = data.payload?.style || data.payload?.theme?.style || "bold";
        setState((prev) => ({
          ...prev,
          style: updateThemeStyle as "bold" | "corner" | "banner",
          position: data.payload?.position || prev.position,
          format: data.payload?.format || prev.format,
          size: data.payload?.size || prev.size,
          theme: {
            ...prev.theme,
            ...data.payload?.theme,
            color: data.payload?.theme?.color || prev.theme?.color,
            shadow: data.payload?.theme?.shadow !== undefined ? data.payload.theme.shadow : prev.theme?.shadow,
          },
        }));
        break;
      case "add-time":
        setState((prev) => ({
          ...prev,
          seconds: prev.seconds + (data.payload?.seconds ?? 0),
        }));
        break;
    }

    // Send acknowledgment for the event
    sendAckRef.current(data.id);
  }, []);

  const { sendAck } = useWebSocketChannel<CountdownEvent>(
    "countdown",
    handleMessage,
    { logPrefix: "Countdown" }
  );

  // Keep sendAckRef in sync with the hook's sendAck
  useEffect(() => {
    sendAckRef.current = sendAck;
  }, [sendAck]);

  useEffect(() => {
    if (state.isRunning && state.seconds > 0) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          const newSeconds = prev.seconds - 1;
          if (newSeconds <= 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return { ...prev, seconds: 0, isRunning: false, visible: false };
          }
          return { ...prev, seconds: newSeconds };
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, state.seconds]);

  if (!state.visible) {
    return null;
  }

  console.log("[Countdown] Rendering with theme:", {
    hasTheme: !!state.theme,
    colors: state.theme?.colors,
    font: state.theme?.font,
    layout: state.theme?.layout,
    style: state.style,
    position: state.position,
    format: state.format,
    size: state.size,
  });

  return (
    <CountdownDisplay
      seconds={state.seconds}
      style={state.style}
      position={state.position}
      format={state.format}
      size={state.size}
      theme={state.theme}
      isPreview={false}
    />
  );
}

