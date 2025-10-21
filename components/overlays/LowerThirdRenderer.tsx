"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { LowerThirdShowPayload } from "@/lib/models/OverlayEvents";
import "./lower-third.css";

interface ThemeData {
  colors: {
    primary: string;
    accent: string;
    surface: string;
    text: string;
    success: string;
    warn: string;
  };
  template: string;
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

interface LowerThirdState {
  visible: boolean;
  animating: boolean;
  title: string;
  subtitle?: string;
  side: "left" | "right";
  accentColor: string;
  avatarUrl?: string;
  theme?: ThemeData;
}

/**
 * LowerThirdRenderer displays lower third overlays
 */
export function LowerThirdRenderer() {
  const [state, setState] = useState<LowerThirdState>({
    visible: false,
    animating: false,
    title: "",
    subtitle: "",
    side: "left",
    accentColor: "#3b82f6",
  });

  const ws = useRef<WebSocket | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleEvent = useCallback((data: { type: string; payload?: LowerThirdShowPayload; id: string }) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }

    switch (data.type) {
      case "show":
        if (data.payload) {
          console.log("[LowerThird] Received show payload:", data.payload);
          console.log("[LowerThird] Has theme?", !!data.payload.theme);
          if (data.payload.theme) {
            console.log("[LowerThird] Theme data:", {
              colors: data.payload.theme.colors,
              font: data.payload.theme.font,
              layout: data.payload.theme.layout,
            });
          }
          setState({
            visible: true,
            animating: true,
            title: data.payload.title,
            subtitle: data.payload.subtitle,
            side: data.payload.side,
            accentColor: data.payload.accentColor || data.payload.theme?.colors?.primary || "#3b82f6",
            avatarUrl: data.payload.avatarUrl,
            theme: data.payload.theme,
          });

          if (data.payload.duration) {
            hideTimeout.current = setTimeout(() => {
              setState((prev) => ({ ...prev, animating: false }));
              setTimeout(() => {
                setState((prev) => ({ ...prev, visible: false }));
              }, 500); // Wait for animation to complete
            }, data.payload.duration * 1000);
          }
        }
        break;
      case "hide":
        setState((prev) => ({ ...prev, animating: false }));
        setTimeout(() => {
          setState((prev) => ({ ...prev, visible: false }));
        }, 500); // Wait for animation to complete
        break;
      case "update":
        console.log("[LowerThird] Received update payload:", data.payload);
        setState((prev) => ({
          ...prev,
          ...data.payload,
          accentColor: data.payload?.accentColor || prev.accentColor,
          avatarUrl: data.payload?.avatarUrl !== undefined ? data.payload.avatarUrl : prev.avatarUrl,
        }));
        break;
    }

    // Send acknowledgment
    if (ws.current) {
      ws.current.send(
        JSON.stringify({
          type: "ack",
          eventId: data.id,
          channel: "lower",
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

      const wsUrl = `ws://${window.location.hostname}:3001`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        if (!isMounted) {
          ws.current?.close();
          return;
        }
        console.log("[LowerThird] Connected to WebSocket");
        ws.current?.send(
          JSON.stringify({
            type: "subscribe",
            channel: "lower",
          })
        );
      };

      const handleMessage = (event: MessageEvent) => {
        if (!isMounted) return;
        try {
          const message = JSON.parse(event.data);
          if (message.channel === "lower") {
            handleEvent(message.data);
          }
        } catch (error) {
          console.error("[LowerThird] Failed to parse message:", error);
        }
      };

      ws.current.onmessage = handleMessage;

      ws.current.onerror = (error) => {
        console.error("[LowerThird] WebSocket error:", error);
      };

      ws.current.onclose = (event) => {
        // Only auto-reconnect on unexpected disconnections
        // Code 1000 = normal closure, 1001 = going away (page navigation)
        if (isMounted && event.code !== 1000 && event.code !== 1001) {
          console.log("[LowerThird] WebSocket closed unexpectedly, reconnecting in 3s...");
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        } else {
          console.log("[LowerThird] WebSocket closed normally");
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
    };
  }, [handleEvent]);

  if (!state.visible) {
    return null;
  }

  // Apply theme styles
  const layout = state.theme?.layout || { x: 60, y: 920, scale: 1 };
  
  // Use theme colors if available, otherwise fall back to accentColor
  const accentColor = state.theme?.colors.primary || state.accentColor;
  const backgroundColor = state.theme 
    ? `linear-gradient(90deg, ${state.theme.colors.surface}E6 0%, ${state.theme.colors.surface}D9 100%)`
    : "linear-gradient(90deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.85) 100%)";
  
  const containerStyle: React.CSSProperties = {
    background: backgroundColor,
    // Apply layout positioning
    left: `${layout.x}px`,
    bottom: `${1080 - layout.y}px`,
    transform: `translateY(100%) scale(${layout.scale})`,
    transformOrigin: "bottom left",
  };

  const titleStyle: React.CSSProperties = state.theme ? {
    fontFamily: state.theme.font.family,
    fontSize: `${state.theme.font.size}px`,
    fontWeight: state.theme.font.weight,
    color: state.theme.colors.text,
  } : {
    fontFamily: "inherit",
    fontSize: "28px",
    fontWeight: 700,
    color: "white",
  };

  const subtitleStyle: React.CSSProperties = state.theme ? {
    fontFamily: state.theme.font.family,
    fontSize: `${Math.round(state.theme.font.size * 0.64)}px`,
    fontWeight: Math.max(400, state.theme.font.weight - 200),
    color: state.theme.colors.text,
  } : {
    fontFamily: "inherit",
    fontSize: "18px",
    fontWeight: 400,
    color: "rgba(255, 255, 255, 0.9)",
  };

  console.log("[LowerThird] Rendering with theme:", {
    hasTheme: !!state.theme,
    colors: state.theme?.colors,
    font: state.theme?.font,
    layout: layout,
  });

  return (
    <div
      className={`lower-third ${state.animating ? "animate-in" : "animate-out"}`}
      style={containerStyle}
    >
      <div
        className="lower-third-accent"
        style={{ backgroundColor: accentColor }}
      />
      {state.avatarUrl && state.avatarUrl !== "" && state.avatarUrl !== "null" && (
        <div className="lower-third-avatar-container">
          <div 
            className="lower-third-avatar"
            style={{ borderColor: accentColor }}
          >
            <img src={state.avatarUrl} alt={state.title} />
          </div>
        </div>
      )}
      <div className="lower-third-content">
        <div className="lower-third-title" style={titleStyle}>{state.title}</div>
        {state.subtitle && (
          <div className="lower-third-subtitle" style={subtitleStyle}>{state.subtitle}</div>
        )}
      </div>
    </div>
  );
}

