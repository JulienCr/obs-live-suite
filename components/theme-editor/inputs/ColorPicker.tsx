"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  className?: string;
  id?: string;
}

/**
 * Reusable color picker component with swatch and hex input
 */
export function ColorPicker({
  label,
  value,
  onChange,
  description,
  className,
  id,
}: ColorPickerProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={inputId} className="text-xs capitalize">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded border cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-xs"
          placeholder="#000000"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
