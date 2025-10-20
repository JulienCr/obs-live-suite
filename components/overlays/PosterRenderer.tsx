"use client";

import { useEffect, useState, useRef } from "react";
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

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.channel === "poster") {
          handleEvent(message.data);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    return () => {
      ws.current?.close();
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    };
  }, []);

  const handleEvent = (data: any) => {
    switch (data.type) {
      case "show":
        showPoster(data.payload);
        break;
      case "hide":
        hidePoster();
        break;
    }

    sendAck(data.id, true);
  };

  const showPoster = (payload: PosterShowPayload) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }

    const isVideo =
      payload.fileUrl.endsWith(".mp4") ||
      payload.fileUrl.endsWith(".webm") ||
      payload.fileUrl.endsWith(".mov");

    setState({
      visible: true,
      fileUrl: payload.fileUrl,
      transition: payload.transition,
      isVideo,
    });

    // Auto-hide after duration
    if (payload.duration) {
      hideTimeout.current = setTimeout(() => {
        hidePoster();
      }, payload.duration * 1000);
    }
  };

  const hidePoster = () => {
    setState((prev) => ({ ...prev, visible: false }));
  };

  const sendAck = (eventId: string, success: boolean) => {
    ws.current?.send(
      JSON.stringify({
        type: "ack",
        eventId,
        channel: "poster",
        success,
      })
    );
  };

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
        />
      ) : (
        <img
          className="poster-media"
          src={state.fileUrl}
          alt="Poster"
        />
      )}
    </div>
  );
}

