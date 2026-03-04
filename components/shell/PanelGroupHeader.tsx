"use client";

import { useEffect } from "react";
import type { IDockviewHeaderActionsProps } from "dockview-react";
import { usePanelColorsStore } from "@/lib/stores";

/**
 * Prefix header actions component for Dockview groups.
 * Applies the active panel's color scheme class on the group element
 * for left border coloring. Renders nothing visible.
 */
export function PanelGroupHeader(props: IDockviewHeaderActionsProps) {
  const panelId = props.activePanel?.id ?? "";
  const colors = usePanelColorsStore((s) => s.colors);
  const scheme = colors[panelId]?.scheme ?? "neutral";

  useEffect(() => {
    const el = props.group.element;
    if (!el) return;

    el.classList.forEach((cls) => {
      if (cls.startsWith("panel-scheme-")) {
        el.classList.remove(cls);
      }
    });

    if (scheme !== "neutral") {
      el.classList.add(`panel-scheme-${scheme}`);
    }

    return () => {
      el.classList.forEach((cls) => {
        if (cls.startsWith("panel-scheme-")) {
          el.classList.remove(cls);
        }
      });
    };
  }, [props.group.element, scheme]);

  return null;
}
