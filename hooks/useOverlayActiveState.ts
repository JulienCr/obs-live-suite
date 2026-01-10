"use client";

import { useState, useCallback } from "react";
import { useMultiChannelWebSocket } from "./useMultiChannelWebSocket";
import { useTimeoutMap } from "./useTimeoutMap";
import { OVERLAY_STATE_CHANNELS } from "@/lib/config/overlayChannels";

/**
 * Overlay channel types that can be tracked
 */
export type OverlayChannel =
  | "lower"
  | "poster"
  | "poster-bigpicture"
  | "countdown"
  | "chat-highlight";

/**
 * State for each overlay type
 */
export interface OverlayActiveState {
  lowerThird: {
    active: boolean;
    guestId?: string;
    contentType?: "guest" | "text";
  };
  poster: {
    active: boolean;
    posterId?: string;
    displayMode?: "left" | "right" | "bigpicture";
  };
  countdown: {
    active: boolean;
  };
  chatHighlight: {
    active: boolean;
    messageId?: string;
    username?: string;
  };
}

const INITIAL_STATE: OverlayActiveState = {
  lowerThird: { active: false },
  poster: { active: false },
  countdown: { active: false },
  chatHighlight: { active: false },
};

// ============================================================================
// Channel Handlers
// ============================================================================

type TimeoutControls = {
  set: (key: string, callback: () => void, delay: number) => void;
  clear: (key: string) => void;
};

type SetState = React.Dispatch<React.SetStateAction<OverlayActiveState>>;

type ChannelHandler = (
  channel: string,
  type: string,
  payload: Record<string, unknown> | undefined,
  setState: SetState,
  timeouts: TimeoutControls
) => void;

/**
 * Handles lower third overlay events
 */
function handleLowerEvent(
  _channel: string,
  type: string,
  payload: Record<string, unknown> | undefined,
  setState: SetState,
  timeouts: TimeoutControls
): void {
  timeouts.clear("lowerThird");

  if (type === "show") {
    setState((prev) => ({
      ...prev,
      lowerThird: {
        active: true,
        guestId: payload?.guestId as string | undefined,
        contentType: payload?.contentType as "guest" | "text" | undefined,
      },
    }));
    if (payload?.duration) {
      timeouts.set(
        "lowerThird",
        () => setState((prev) => ({ ...prev, lowerThird: { active: false } })),
        (payload.duration as number) * 1000
      );
    }
  } else if (type === "hide") {
    setState((prev) => ({ ...prev, lowerThird: { active: false } }));
  }
}

/**
 * Handles poster overlay events (both regular and bigpicture)
 */
function handlePosterEvent(
  channel: string,
  type: string,
  payload: Record<string, unknown> | undefined,
  setState: SetState,
  timeouts: TimeoutControls
): void {
  timeouts.clear("poster");

  if (type === "show") {
    setState((prev) => ({
      ...prev,
      poster: {
        active: true,
        posterId: payload?.posterId as string | undefined,
        displayMode:
          channel === "poster-bigpicture"
            ? "bigpicture"
            : (payload?.side as "left" | "right" | undefined),
      },
    }));
    if (payload?.duration) {
      timeouts.set(
        "poster",
        () => setState((prev) => ({ ...prev, poster: { active: false } })),
        (payload.duration as number) * 1000
      );
    }
  } else if (type === "hide") {
    setState((prev) => ({ ...prev, poster: { active: false } }));
  }
}

/**
 * Handles countdown overlay events
 */
function handleCountdownEvent(
  _channel: string,
  type: string,
  _payload: Record<string, unknown> | undefined,
  setState: SetState,
  timeouts: TimeoutControls
): void {
  timeouts.clear("countdown");

  if (type === "start" || type === "resume") {
    setState((prev) => ({ ...prev, countdown: { active: true } }));
  } else if (type === "hide" || type === "reset" || type === "complete") {
    setState((prev) => ({ ...prev, countdown: { active: false } }));
  }
}

/**
 * Handles chat highlight overlay events
 */
function handleChatHighlightEvent(
  _channel: string,
  type: string,
  payload: Record<string, unknown> | undefined,
  setState: SetState,
  timeouts: TimeoutControls
): void {
  timeouts.clear("chatHighlight");

  if (type === "show") {
    setState((prev) => ({
      ...prev,
      chatHighlight: {
        active: true,
        messageId: payload?.messageId as string | undefined,
        username: (payload?.username || payload?.displayName) as string | undefined,
      },
    }));
    if (payload?.duration) {
      timeouts.set(
        "chatHighlight",
        () => setState((prev) => ({ ...prev, chatHighlight: { active: false } })),
        (payload.duration as number) * 1000
      );
    }
  } else if (type === "hide") {
    setState((prev) => ({ ...prev, chatHighlight: { active: false } }));
  }
}

/**
 * Lookup table mapping channel names to their handlers
 */
const channelHandlers: Record<string, ChannelHandler> = {
  lower: handleLowerEvent,
  poster: handlePosterEvent,
  "poster-bigpicture": handlePosterEvent,
  countdown: handleCountdownEvent,
  "chat-highlight": handleChatHighlightEvent,
};

/**
 * Shared hook to track overlay active state by subscribing to WebSocket channels.
 * This hook monitors all overlay channels and maintains a synchronized state
 * that can be used by dashboard panels to show accurate active indicators.
 *
 * The hook listens for "show" and "hide" events and also handles auto-hide
 * when a duration is specified in the payload.
 *
 * @returns OverlayActiveState - Current state of all overlay types
 *
 * @example
 * ```tsx
 * function PosterPanel() {
 *   const overlayState = useOverlayActiveState();
 *   const isActive = overlayState.poster.active;
 *
 *   return (
 *     <div className={isActive ? "border-green-500" : "border-gray-300"}>
 *       {isActive && <Badge>Active</Badge>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOverlayActiveState(): OverlayActiveState {
  const { set: setAutoHideTimeout, clear: clearTimeoutFor } = useTimeoutMap();
  const [state, setState] = useState<OverlayActiveState>(INITIAL_STATE);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (channel: string, rawData: unknown) => {
      const data = rawData as { type?: string; payload?: Record<string, unknown> } | null;
      if (!data?.type) return;

      const handler = channelHandlers[channel];
      if (handler) {
        const timeouts: TimeoutControls = {
          set: setAutoHideTimeout,
          clear: clearTimeoutFor,
        };
        handler(channel, data.type, data.payload, setState, timeouts);
      }
    },
    [setAutoHideTimeout, clearTimeoutFor]
  );

  useMultiChannelWebSocket({
    channels: OVERLAY_STATE_CHANNELS,
    onMessage: handleMessage,
    logPrefix: "OverlayActiveState",
  });

  return state;
}
