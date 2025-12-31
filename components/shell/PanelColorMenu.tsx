"use client";

import { ReactNode, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Palette, RotateCcw, Sun, Moon } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import { usePanelColors } from "./PanelColorsContext";
import type { PanelId } from "@/lib/models/PanelColor";
import { PANEL_DISPLAY_NAMES } from "@/lib/models/PanelColor";

interface ColorPickerItemProps {
  label: string;
  value: string | null;
  onChange: (color: string) => void;
}

function ColorPickerItem({ label, value, onChange }: ColorPickerItemProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <span className="text-sm flex-1">{label}</span>
      <input
        type="color"
        value={value || "#3b82f6"}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 cursor-pointer rounded border border-border"
      />
    </div>
  );
}

interface PanelColorMenuProps {
  panelId: PanelId;
  children: ReactNode;
}

export function PanelColorMenu({ panelId, children }: PanelColorMenuProps) {
  const { colors, updateColor, resetColor } = usePanelColors();
  const { theme, systemTheme } = useTheme();
  const panelColors = colors[panelId];

  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");
  const displayName = PANEL_DISPLAY_NAMES[panelId] || panelId;

  const handleBackgroundChange = useCallback((color: string) => {
    if (isDark) {
      updateColor(panelId, { darkBackground: color });
    } else {
      updateColor(panelId, { lightBackground: color });
    }
  }, [panelId, updateColor, isDark]);

  const handleHeaderChange = useCallback((color: string) => {
    if (isDark) {
      updateColor(panelId, { darkHeader: color });
    } else {
      updateColor(panelId, { lightHeader: color });
    }
  }, [panelId, updateColor, isDark]);

  const handleReset = useCallback(() => {
    resetColor(panelId);
  }, [panelId, resetColor]);

  const currentBackground = isDark
    ? panelColors?.darkBackground
    : panelColors?.lightBackground;
  const currentHeader = isDark
    ? panelColors?.darkHeader
    : panelColors?.lightHeader;

  const hasCustomColors = currentBackground || currentHeader;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {displayName} Colors
          {isDark ? (
            <Moon className="h-3 w-3 ml-auto text-muted-foreground" />
          ) : (
            <Sun className="h-3 w-3 ml-auto text-muted-foreground" />
          )}
        </ContextMenuLabel>
        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border border-border"
                style={{ backgroundColor: currentBackground || "transparent" }}
              />
              Background
            </div>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ColorPickerItem
              label={isDark ? "Dark Mode" : "Light Mode"}
              value={currentBackground}
              onChange={handleBackgroundChange}
            />
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border border-border"
                style={{ backgroundColor: currentHeader || "transparent" }}
              />
              Header/Tab
            </div>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ColorPickerItem
              label={isDark ? "Dark Mode" : "Light Mode"}
              value={currentHeader}
              onChange={handleHeaderChange}
            />
          </ContextMenuSubContent>
        </ContextMenuSub>

        {hasCustomColors && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
