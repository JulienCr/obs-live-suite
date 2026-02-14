"use client";

import { ReactNode, useCallback } from "react";
import { useTheme } from "next-themes";
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
import { usePanelColorsStore } from "@/lib/stores";
import type { PanelId, ColorScheme } from "@/lib/models/PanelColor";
import { PANEL_DISPLAY_NAMES, COLOR_SCHEMES, COLOR_SCHEME_DISPLAY_NAMES } from "@/lib/models/PanelColor";

/**
 * Hardcoded preview colors for each scheme
 */
const SCHEME_PREVIEW_COLORS: Record<ColorScheme, {
  light: { bg: string; header: string };
  dark: { bg: string; header: string };
}> = {
  neutral: {
    light: { bg: "hsl(210, 40%, 96%)", header: "hsl(210, 40%, 90%)" },
    dark: { bg: "hsl(222, 84%, 5%)", header: "hsl(217, 33%, 17%)" },
  },
  red: {
    light: { bg: "hsl(0, 60%, 94%)", header: "hsl(0, 50%, 88%)" },
    dark: { bg: "hsl(0, 35%, 10%)", header: "hsl(0, 28%, 18%)" },
  },
  blue: {
    light: { bg: "hsl(210, 60%, 94%)", header: "hsl(210, 50%, 88%)" },
    dark: { bg: "hsl(210, 35%, 10%)", header: "hsl(210, 28%, 18%)" },
  },
  green: {
    light: { bg: "hsl(140, 45%, 92%)", header: "hsl(140, 40%, 85%)" },
    dark: { bg: "hsl(140, 28%, 9%)", header: "hsl(140, 20%, 17%)" },
  },
  yellow: {
    light: { bg: "hsl(45, 70%, 92%)", header: "hsl(45, 60%, 84%)" },
    dark: { bg: "hsl(45, 35%, 9%)", header: "hsl(45, 25%, 17%)" },
  },
  purple: {
    light: { bg: "hsl(270, 45%, 94%)", header: "hsl(270, 40%, 88%)" },
    dark: { bg: "hsl(270, 28%, 11%)", header: "hsl(270, 20%, 19%)" },
  },
  orange: {
    light: { bg: "hsl(25, 70%, 92%)", header: "hsl(25, 60%, 85%)" },
    dark: { bg: "hsl(25, 35%, 9%)", header: "hsl(25, 25%, 17%)" },
  },
  pink: {
    light: { bg: "hsl(330, 55%, 94%)", header: "hsl(330, 45%, 88%)" },
    dark: { bg: "hsl(330, 28%, 11%)", header: "hsl(330, 20%, 19%)" },
  },
  cyan: {
    light: { bg: "hsl(195, 50%, 92%)", header: "hsl(195, 45%, 85%)" },
    dark: { bg: "hsl(195, 32%, 9%)", header: "hsl(195, 22%, 17%)" },
  },
};

/**
 * Color swatch preview component showing body and header colors
 */
function SchemePreview({ scheme, isDark }: { scheme: ColorScheme; isDark: boolean }) {
  const colors = SCHEME_PREVIEW_COLORS[scheme][isDark ? "dark" : "light"];
  return (
    <div className="flex gap-0.5">
      <div
        className="w-3 h-3 rounded-sm border border-border"
        style={{ backgroundColor: colors.bg }}
      />
      <div
        className="w-3 h-3 rounded-sm border border-border"
        style={{ backgroundColor: colors.header }}
      />
    </div>
  );
}

interface PanelColorMenuProps {
  panelId: PanelId;
  children: ReactNode;
}

export function PanelColorMenu({ panelId, children }: PanelColorMenuProps) {
  const { theme } = useTheme();
  const colors = usePanelColorsStore((s) => s.colors);
  const setScheme = usePanelColorsStore((s) => s.setScheme);
  const resetScheme = usePanelColorsStore((s) => s.resetScheme);
  const currentScheme = colors[panelId]?.scheme ?? "neutral";
  const displayName = PANEL_DISPLAY_NAMES[panelId] || panelId;
  const isDark = theme === "dark";

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
                <SchemePreview scheme={scheme} isDark={isDark} />
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
