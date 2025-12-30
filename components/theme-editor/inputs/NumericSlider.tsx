"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface NumericSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
  showSlider?: boolean;
  className?: string;
  id?: string;
}

/**
 * Reusable numeric input with optional slider
 */
export function NumericSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  description,
  showSlider = true,
  className,
  id,
}: NumericSliderProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  const handleChange = (newValue: number) => {
    const clampedValue = Math.min(Math.max(newValue, min), max);
    onChange(clampedValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={inputId} className="text-xs">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        {showSlider && (
          <Slider
            value={[value]}
            onValueChange={([newValue]) => handleChange(newValue)}
            min={min}
            max={max}
            step={step}
            className="flex-1"
          />
        )}
        <div className="flex items-center gap-1">
          <Input
            id={inputId}
            type="number"
            value={value}
            onChange={(e) => handleChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            className={cn("w-20 text-xs", !showSlider && "flex-1")}
          />
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
