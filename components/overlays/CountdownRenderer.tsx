"use client";

import { useEffect, useState, useRef } from "react";
import "./countdown.css";

interface CountdownState {
  visible: boolean;
  seconds: number;
  isRunning: boolean;
  style: "bold" | "corner" | "banner";
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
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Connect to WebSocket server
    const wsUrl = `ws://${window.location.hostname}:3001`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("Connected to WebSocket");
      ws.current?.send(
        JSON.stringify({
          type: "subscribe",
          channel: "countdown",
        })
      );
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.channel === "countdown") {
          handleEvent(message.data);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    return () => {
      ws.current?.close();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (state.isRunning && state.seconds > 0) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.seconds <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return { ...prev, seconds: 0, isRunning: false, visible: false };
          }
          return { ...prev, seconds: prev.seconds - 1 };
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
  }, [state.isRunning]);

  const handleEvent = (data: any) => {
    switch (data.type) {
      case "set":
        setState((prev) => ({
          ...prev,
          seconds: data.payload.seconds,
          visible: true,
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
    }

    sendAck(data.id, true);
  };

  const sendAck = (eventId: string, success: boolean) => {
    ws.current?.send(
      JSON.stringify({
        type: "ack",
        eventId,
        channel: "countdown",
        success,
      })
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!state.visible) {
    return null;
  }

  return (
    <div className={`countdown countdown-${state.style}`}>
      <div className="countdown-time">{formatTime(state.seconds)}</div>
      {state.seconds <= 10 && state.seconds > 0 && (
        <div className="countdown-warning">URGENT</div>
      )}
    </div>
  );
}

