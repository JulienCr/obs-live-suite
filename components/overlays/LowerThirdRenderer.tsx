"use client";

import { useEffect, useState, useRef } from "react";
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

  useEffect(() => {
    // Connect to WebSocket server
    const wsUrl = `ws://${window.location.hostname}:3001`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("Connected to WebSocket");
      // Subscribe to lower third channel
      ws.current?.send(
        JSON.stringify({
          type: "subscribe",
          channel: "lower",
        })
      );
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.channel === "lower") {
          handleEvent(message.data);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.current.onclose = () => {
      console.log("WebSocket closed, reconnecting...");
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  const handleEvent = (data: any) => {
    switch (data.type) {
      case "show":
        showLowerThird(data.payload);
        break;
      case "hide":
        hideLowerThird();
        break;
      case "update":
        updateLowerThird(data.payload);
        break;
    }

    // Send acknowledgment
    sendAck(data.id, true);
  };

  const showLowerThird = (payload: LowerThirdShowPayload) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }

    setState({
      visible: true,
      title: payload.title,
      subtitle: payload.subtitle,
      side: payload.side,
      accentColor: "#3b82f6", // TODO: Get from theme
    });

    // Auto-hide after duration
    if (payload.duration) {
      hideTimeout.current = setTimeout(() => {
        hideLowerThird();
      }, payload.duration * 1000);
    }
  };

  const hideLowerThird = () => {
    setState((prev) => ({ ...prev, visible: false }));
  };

  const updateLowerThird = (payload: Partial<LowerThirdShowPayload>) => {
    setState((prev) => ({
      ...prev,
      ...payload,
      accentColor: prev.accentColor,
    }));
  };

  const sendAck = (eventId: string, success: boolean) => {
    ws.current?.send(
      JSON.stringify({
        type: "ack",
        eventId,
        channel: "lower",
        success,
      })
    );
  };

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

