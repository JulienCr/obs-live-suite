"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { CountdownDisplay } from "./CountdownDisplay";
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
  theme?: ThemeData & {
    color?: string;
    shadow?: boolean;
  };
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

  const ws = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleEvent = useCallback((data: { type: string; payload?: any; id: string }) => {
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

    if (ws.current) {
      ws.current.send(
        JSON.stringify({
          type: "ack",
          eventId: data.id,
          channel: "countdown",
          success: true,
        })
      );
    }
  }, []);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isMounted = true;

    const connect = () => {
      // Don't create new connection if component is unmounting
      if (!isMounted) return;

      // Close existing connection before creating new one
      if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
        try {
          ws.current.close();
        } catch {
          // Ignore close errors
        }
      }

      const wsUrl = `ws://${window.location.hostname}:3003`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        if (!isMounted) {
          ws.current?.close();
          return;
        }
        console.log("[Countdown] Connected to WebSocket");
        ws.current?.send(
          JSON.stringify({
            type: "subscribe",
            channel: "countdown",
          })
        );
      };

      const handleMessage = (event: MessageEvent) => {
        if (!isMounted) return;
        try {
          const message = JSON.parse(event.data);
          if (message.channel === "countdown") {
            handleEvent(message.data);
          }
        } catch (error) {
          console.error("[Countdown] Failed to parse message:", error);
        }
      };

      ws.current.onmessage = handleMessage;

      ws.current.onerror = (error) => {
        console.error("[Countdown] WebSocket error:", error);
      };

      ws.current.onclose = (event) => {
        // Only auto-reconnect on unexpected disconnections
        // Code 1000 = normal closure, 1001 = going away (page navigation)
        if (isMounted && event.code !== 1000 && event.code !== 1001) {
          console.log("[Countdown] WebSocket closed unexpectedly, reconnecting in 3s...");
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        } else {
          console.log("[Countdown] WebSocket closed normally");
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        try {
          ws.current.close(1000, "Component unmounting");
        } catch {
          // Ignore close errors during cleanup
        }
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [handleEvent]);

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

