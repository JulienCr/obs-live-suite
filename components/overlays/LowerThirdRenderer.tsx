"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { LowerThirdShowPayload } from "@/lib/models/OverlayEvents";
import "./lower-third.css";

interface LowerThirdState {
  visible: boolean;
  title: string;
  subtitle?: string;
  side: "left" | "right";
  accentColor: string;
}

/**
 * LowerThirdRenderer displays lower third overlays
 */
export function LowerThirdRenderer() {
  const [state, setState] = useState<LowerThirdState>({
    visible: false,
    title: "",
    subtitle: "",
    side: "left",
    accentColor: "#3b82f6",
  });

  const ws = useRef<WebSocket | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout>();

  const handleEvent = useCallback((data: { type: string; payload?: LowerThirdShowPayload; id: string }) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }

    switch (data.type) {
      case "show":
        if (data.payload) {
          setState({
            visible: true,
            title: data.payload.title,
            subtitle: data.payload.subtitle,
            side: data.payload.side,
            accentColor: "#3b82f6",
          });

          if (data.payload.duration) {
            hideTimeout.current = setTimeout(() => {
              setState((prev) => ({ ...prev, visible: false }));
            }, data.payload.duration * 1000);
          }
        }
        break;
      case "hide":
        setState((prev) => ({ ...prev, visible: false }));
        break;
      case "update":
        setState((prev) => ({
          ...prev,
          ...data.payload,
          accentColor: prev.accentColor,
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
        } catch (error) {
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
        } catch (error) {
          // Ignore close errors during cleanup
        }
      }
    };
  }, [handleEvent]);

  if (!state.visible) {
    return null;
  }

  return (
    <div
      className={`lower-third lower-third-${state.side} ${
        state.visible ? "animate-in" : "animate-out"
      }`}
    >
      <div
        className="lower-third-accent"
        style={{ backgroundColor: state.accentColor }}
      />
      <div className="lower-third-content">
        <div className="lower-third-title">{state.title}</div>
        {state.subtitle && (
          <div className="lower-third-subtitle">{state.subtitle}</div>
        )}
      </div>
    </div>
  );
}

