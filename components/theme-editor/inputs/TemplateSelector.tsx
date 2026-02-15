"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface TemplateSelectorOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface TemplateSelectorProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<TemplateSelectorOption<T>>;
  className?: string;
}

/**
 * Visual template/style selector with grid layout
 */
export function TemplateSelector<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: TemplateSelectorProps<T>) {
  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-xs">{label}</Label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "relative p-3 rounded-lg border-2 text-left transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                "focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isSelected
                  ? "border-primary bg-accent"
                  : "border-border bg-background"
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
              )}
              <div className="text-sm font-medium capitalize">{option.label}</div>
              {option.description && (
                <div className="text-xs text-muted-foreground mt-1">
                  {option.description}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
