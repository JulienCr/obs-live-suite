"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { PosterShowPayload } from "@/lib/models/OverlayEvents";
import "./poster.css";

interface PosterState {
  visible: boolean;
  fileUrl: string;
  transition: "fade" | "slide" | "cut" | "blur";
  isVideo: boolean;
}

/**
 * PosterRenderer displays poster/image overlays
 */
export function PosterRenderer() {
  const [state, setState] = useState<PosterState>({
    visible: false,
    fileUrl: "",
    transition: "fade",
    isVideo: false,
  });

  const ws = useRef<WebSocket | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout>();

  const handleEvent = useCallback((data: { type: string; payload?: PosterShowPayload; id: string }) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }

    switch (data.type) {
      case "show":
        if (data.payload) {
          const isVideo =
            data.payload.fileUrl.endsWith(".mp4") ||
            data.payload.fileUrl.endsWith(".webm") ||
            data.payload.fileUrl.endsWith(".mov");

          setState({
            visible: true,
            fileUrl: data.payload.fileUrl,
            transition: data.payload.transition,
            isVideo,
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
    }

    // Send acknowledgment
    if (ws.current) {
      ws.current.send(
        JSON.stringify({
          type: "ack",
          eventId: data.id,
          channel: "poster",
          success: true,
        })
      );
    }
  }, []);

  useEffect(() => {
    // Connect to WebSocket server
    const wsUrl = `ws://${window.location.hostname}:3001`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("Connected to WebSocket");
      ws.current?.send(
        JSON.stringify({
          type: "subscribe",
          channel: "poster",
        })
      );
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.channel === "poster") {
          handleEvent(message.data);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    ws.current.onmessage = handleMessage;

    return () => {
      ws.current?.close();
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    };
  }, [handleEvent]);

  if (!state.visible) {
    return null;
  }

  return (
    <div className={`poster poster-transition-${state.transition}`}>
      {state.isVideo ? (
        <video
          className="poster-media"
          src={state.fileUrl}
          autoPlay
          loop
          muted
          aria-label="Poster video"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="poster-media"
          src={state.fileUrl}
          alt="Poster"
        />
      )}
    </div>
  );
}

