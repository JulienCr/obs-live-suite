"use client";

import { useEffect } from "react";
import type { IDockviewHeaderActionsProps } from "dockview-react";
import { usePanelColorsStore } from "@/lib/stores";
import { COLOR_SCHEMES, getPanelSchemeClass } from "@/lib/models/PanelColor";

/**
 * Prefix header actions component for Dockview groups.
 * Applies the active panel's color scheme class on the group element
 * for left border coloring. Renders nothing visible.
 */
export function PanelGroupHeader(props: IDockviewHeaderActionsProps) {
  const panelId = props.activePanel?.id ?? "";
  const scheme = usePanelColorsStore((s) => s.colors[panelId]?.scheme ?? "neutral");

  useEffect(() => {
    const el = props.group.element;
    if (!el) return;

    // Remove all scheme classes (bounded by COLOR_SCHEMES.length, not classList size)
    for (const s of COLOR_SCHEMES) {
      if (s !== "neutral") el.classList.remove(`panel-scheme-${s}`);
    }

    const classToAdd = getPanelSchemeClass(scheme) || null;
    if (classToAdd) el.classList.add(classToAdd);

    return () => {
      if (classToAdd) el.classList.remove(classToAdd);
    };
  }, [scheme]);

  return null;
}
