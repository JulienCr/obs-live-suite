"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { FontConfig } from "@/lib/models/Theme";
import { NumericSlider } from "./NumericSlider";
import { cn } from "@/lib/utils";

const FONT_WEIGHTS = [
  { value: "300", label: "Light (300)" },
  { value: "400", label: "Regular (400)" },
  { value: "500", label: "Medium (500)" },
  { value: "600", label: "Semi-Bold (600)" },
  { value: "700", label: "Bold (700)" },
  { value: "800", label: "Extra-Bold (800)" },
  { value: "900", label: "Black (900)" },
];

interface FontEditorProps {
  label?: string;
  value: FontConfig;
  onChange: (value: FontConfig) => void;
  onReset?: () => void;
  className?: string;
}

/**
 * Reusable font configuration editor
 */
export function FontEditor({
  label,
  value,
  onChange,
  onReset,
  className,
}: FontEditorProps) {
  const updateField = (field: keyof FontConfig, newValue: string | number) => {
    onChange({ ...value, [field]: newValue });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
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
      )}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Font Family</Label>
          <Input
            value={value.family}
            onChange={(e) => updateField("family", e.target.value)}
            placeholder="Inter, sans-serif"
            className="text-xs"
          />
        </div>

        <NumericSlider
          label="Font Size"
          value={value.size}
          onChange={(newSize) => updateField("size", newSize)}
          min={12}
          max={120}
          step={1}
          unit="px"
        />

        <div className="space-y-2">
          <Label className="text-xs">Font Weight</Label>
          <Select
            value={String(value.weight)}
            onValueChange={(newWeight) => updateField("weight", Number(newWeight))}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select weight" />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((weight) => (
                <SelectItem key={weight.value} value={weight.value} className="text-xs">
                  {weight.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
