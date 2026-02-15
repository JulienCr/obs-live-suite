"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { PositionEditor } from "../inputs/PositionEditor";
import { useThemeEditorStore, DEFAULT_FORM_DATA } from "@/lib/stores";
import { useShallow } from "zustand/react/shallow";

/**
 * Positioning tab for theme editor
 */
export function PositioningTab() {
  const { lowerThirdLayout, countdownLayout, posterLayout } =
    useThemeEditorStore(
      useShallow((s) => ({
        lowerThirdLayout: s.formData.lowerThirdLayout,
        countdownLayout: s.formData.countdownLayout,
        posterLayout: s.formData.posterLayout,
      }))
    );
  const updateLowerThirdLayout = useThemeEditorStore((s) => s.updateLowerThirdLayout);
  const updateCountdownLayout = useThemeEditorStore((s) => s.updateCountdownLayout);
  const updatePosterLayout = useThemeEditorStore((s) => s.updatePosterLayout);
  const resetLowerThirdLayout = useThemeEditorStore((s) => s.resetLowerThirdLayout);
  const resetCountdownLayout = useThemeEditorStore((s) => s.resetCountdownLayout);
  const resetPosterLayout = useThemeEditorStore((s) => s.resetPosterLayout);
  const resetAllLayouts = useThemeEditorStore((s) => s.resetAllLayouts);

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
          value={lowerThirdLayout || DEFAULT_FORM_DATA.lowerThirdLayout!}
          onChange={updateLowerThirdLayout}
          onReset={resetLowerThirdLayout}
        />

        <PositionEditor
          label="Countdown"
          value={countdownLayout || DEFAULT_FORM_DATA.countdownLayout!}
          onChange={updateCountdownLayout}
          onReset={resetCountdownLayout}
        />

        <PositionEditor
          label="Poster"
          value={posterLayout || DEFAULT_FORM_DATA.posterLayout!}
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
