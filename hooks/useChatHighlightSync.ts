"use client";

import { useSyncWithOverlayState } from "./useSyncWithOverlayState";

/**
 * Specialized hook for syncing chat highlight state between panels.
 * Extracts the common pattern from RegiePublicChatPanel and StreamerbotChatPanel.
 */
export function useChatHighlightSync(
  currentlyDisplayedId: string | null,
  setCurrentlyDisplayedId: (id: string | null) => void
) {
  useSyncWithOverlayState({
    overlayType: "chatHighlight",
    localActive: currentlyDisplayedId !== null,
    onExternalHide: () => setCurrentlyDisplayedId(null),
    onExternalShow: (state) => {
      if (state.active && "messageId" in state && state.messageId) {
        setCurrentlyDisplayedId(state.messageId);
      }
    },
  });
}
