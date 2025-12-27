"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { NumericSlider } from "./NumericSlider";
import { cn } from "@/lib/utils";

export interface LayoutConfig {
  x: number;
  y: number;
  scale: number;
}

interface PositionEditorProps {
  label: string;
  value: LayoutConfig;
  onChange: (value: LayoutConfig) => void;
  onReset?: () => void;
  bounds?: { maxX: number; maxY: number };
  className?: string;
}

/**
 * Reusable position editor for overlay layouts
 */
export function PositionEditor({
  label,
  value,
  onChange,
  onReset,
  bounds = { maxX: 1920, maxY: 1080 },
  className,
}: PositionEditorProps) {
  const updateField = (field: keyof LayoutConfig, newValue: number) => {
    onChange({ ...value, [field]: newValue });
  };

  return (
    <div className={cn("space-y-3 p-4 border rounded-lg bg-muted/20", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{label}</h4>
        {onReset && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onReset}
            className="h-7 px-2 text-xs"
            title="Reset to default"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <NumericSlider
        label="X Position"
        value={value.x}
        onChange={(newX) => updateField("x", newX)}
        min={0}
        max={bounds.maxX}
        step={10}
        unit="px"
      />

      <NumericSlider
        label="Y Position"
        value={value.y}
        onChange={(newY) => updateField("y", newY)}
        min={0}
        max={bounds.maxY}
        step={10}
        unit="px"
      />

      <NumericSlider
        label="Scale"
        value={value.scale}
        onChange={(newScale) => updateField("scale", newScale)}
        min={0.5}
        max={2}
        step={0.1}
        unit="x"
      />

      <div className="text-xs text-muted-foreground pt-2 border-t">
        Coordinates: ({value.x}, {value.y}) · Scale: {value.scale}x
      </div>
    </div>
  );
}
