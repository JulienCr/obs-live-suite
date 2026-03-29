"use client";

import { useState, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { SommaireDisplay } from "./SommaireDisplay";
import { OverlayMotionProvider } from "./OverlayMotionProvider";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import type { SommaireShowPayload, SommaireHighlightPayload } from "@/lib/models/OverlayEvents";

interface SommaireState {
  visible: boolean;
  categories: SommaireShowPayload["categories"];
  activeIndex: number;
  activeSubIndex: number;
}

interface SommaireEvent {
  type: string;
  payload?: SommaireShowPayload | SommaireHighlightPayload;
  id: string;
}

/**
 * SommaireRenderer manages WebSocket connection and state for the sommaire overlay.
 * Uses Framer Motion AnimatePresence for smooth enter/exit animations.
 */
export function SommaireRenderer() {
  const [state, setState] = useState<SommaireState>({
    visible: false,
    categories: [],
    activeIndex: -1,
    activeSubIndex: -1,
  });

  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(() => {});

  const handleEvent = useCallback((data: SommaireEvent) => {
    switch (data.type) {
      case "show":
        if (data.payload && "categories" in data.payload) {
          const showPayload = data.payload as SommaireShowPayload;
          setState({
            visible: true,
            categories: showPayload.categories,
            activeIndex: showPayload.activeIndex ?? -1,
            activeSubIndex: showPayload.activeSubIndex ?? -1,
          });
        }
        break;

      case "hide":
        setState((prev) => ({ ...prev, visible: false }));
        break;

      case "highlight":
        if (data.payload && "activeIndex" in data.payload) {
          const highlightPayload = data.payload as SommaireHighlightPayload;
          setState((prev) => ({
            ...prev,
            activeIndex: highlightPayload.activeIndex,
            activeSubIndex: highlightPayload.activeSubIndex ?? -1,
          }));
        }
        break;
    }

    sendAckRef.current(data.id);
  }, []);

  const { sendAck } = useWebSocketChannel<SommaireEvent>(
    "sommaire",
    handleEvent,
    { logPrefix: "Sommaire" }
  );

  sendAckRef.current = sendAck;

  return (
    <OverlayMotionProvider>
      <AnimatePresence>
        {state.visible && state.categories.length > 0 && (
          <SommaireDisplay
            key="sommaire"
            categories={state.categories}
            activeIndex={state.activeIndex}
            activeSubIndex={state.activeSubIndex}
          />
        )}
      </AnimatePresence>
    </OverlayMotionProvider>
  );
}
