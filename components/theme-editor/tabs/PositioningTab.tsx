"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { PositionEditor } from "../inputs/PositionEditor";
import { useThemeEditor } from "../ThemeEditorContext";

/**
 * Positioning tab for theme editor
 */
export function PositioningTab() {
  const {
    formData,
    updateLowerThirdLayout,
    updateCountdownLayout,
    updatePosterLayout,
    resetLowerThirdLayout,
    resetCountdownLayout,
    resetPosterLayout,
    resetAllLayouts,
  } = useThemeEditor();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Overlay Positions</h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={resetAllLayouts}
          className="h-7 px-2 text-xs"
          title="Reset all positions to default"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <PositionEditor
          label="Lower Third"
          value={formData.lowerThirdLayout || { x: 60, y: 920, scale: 1 }}
          onChange={updateLowerThirdLayout}
          onReset={resetLowerThirdLayout}
        />

        <PositionEditor
          label="Countdown"
          value={formData.countdownLayout || { x: 960, y: 540, scale: 1 }}
          onChange={updateCountdownLayout}
          onReset={resetCountdownLayout}
        />

        <PositionEditor
          label="Poster"
          value={formData.posterLayout || { x: 960, y: 540, scale: 1 }}
          onChange={updatePosterLayout}
          onReset={resetPosterLayout}
        />
      </div>

      <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded">
        <p className="font-semibold mb-1">Canvas Reference: 1920×1080</p>
        <p>Position values represent pixel coordinates on a 16:9 canvas. Use the visual canvas above to preview positioning.</p>
      </div>
    </div>
  );
}
