"use client";

import { ReactNode, useCallback } from "react";
import { Palette, RotateCcw } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
} from "@/components/ui/context-menu";
import { usePanelColors } from "./PanelColorsContext";
import type { PanelId, ColorScheme } from "@/lib/models/PanelColor";
import { PANEL_DISPLAY_NAMES, COLOR_SCHEMES, COLOR_SCHEME_DISPLAY_NAMES } from "@/lib/models/PanelColor";

/**
 * Color swatch preview component showing body and header colors
 */
function SchemePreview({ scheme }: { scheme: ColorScheme }) {
  return (
    <div className="flex gap-0.5">
      <div
        className="w-3 h-3 rounded-sm border border-border"
        style={{ backgroundColor: `var(--panel-${scheme}-body)` }}
      />
      <div
        className="w-3 h-3 rounded-sm border border-border"
        style={{ backgroundColor: `var(--panel-${scheme}-header)` }}
      />
    </div>
  );
}

interface PanelColorMenuProps {
  panelId: PanelId;
  children: ReactNode;
}

export function PanelColorMenu({ panelId, children }: PanelColorMenuProps) {
  const { colors, setScheme, resetScheme } = usePanelColors();
  const currentScheme = colors[panelId]?.scheme ?? "neutral";
  const displayName = PANEL_DISPLAY_NAMES[panelId] || panelId;

  const handleSchemeChange = useCallback((scheme: string) => {
    setScheme(panelId, scheme as ColorScheme);
  }, [panelId, setScheme]);

  const handleReset = useCallback(() => {
    resetScheme(panelId);
  }, [panelId, resetScheme]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {displayName} Color
        </ContextMenuLabel>
        <ContextMenuSeparator />

        <ContextMenuRadioGroup value={currentScheme} onValueChange={handleSchemeChange}>
          {COLOR_SCHEMES.map((scheme) => (
            <ContextMenuRadioItem key={scheme} value={scheme}>
              <div className="flex items-center gap-2">
                <SchemePreview scheme={scheme} />
                {COLOR_SCHEME_DISPLAY_NAMES[scheme]}
              </div>
            </ContextMenuRadioItem>
          ))}
        </ContextMenuRadioGroup>

        {currentScheme !== "neutral" && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Neutral
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
