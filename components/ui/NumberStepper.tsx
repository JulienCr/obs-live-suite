"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NumberStepperProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "step" | "min" | "max"> {
  value: number;
  onChange: (value: number) => void;
  /** Step increment for arrow keys / buttons (default 1) */
  step?: number;
  /** Step increment when Shift is held (default 10) */
  shiftStep?: number;
  min?: number;
  max?: number;
}

/**
 * Styled number input with custom stepper arrows.
 *
 * - Arrow keys and buttons step by `step` (default 1)
 * - Hold Shift for `shiftStep` (default 10)
 * - Native browser spinners are hidden
 */
const NumberStepper = React.forwardRef<HTMLInputElement, NumberStepperProps>(
  (
    {
      value,
      onChange,
      step = 1,
      shiftStep = 10,
      min,
      max,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [shiftHeld, setShiftHeld] = useState(false);

    useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.key === "Shift") setShiftHeld(true);
      };
      const up = (e: KeyboardEvent) => {
        if (e.key === "Shift") setShiftHeld(false);
      };
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
      return () => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
      };
    }, []);

    const clamp = useCallback(
      (v: number) => {
        if (min !== undefined) v = Math.max(min, v);
        if (max !== undefined) v = Math.min(max, v);
        return v;
      },
      [min, max]
    );

    const increment = shiftHeld ? shiftStep : step;

    return (
      <div className={cn("relative flex items-center", className)}>
        <input
          ref={ref}
          type="number"
          value={value}
          step={increment}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className={cn(
            "h-8 w-full rounded border border-input bg-background px-2.5 pr-7 py-0 text-xs leading-8 ring-offset-background",
            "placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
          {...props}
        />
        <div className="absolute right-0 inset-y-0 flex flex-col w-6 border-l border-input">
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            className="flex-1 flex items-center justify-center hover:bg-accent rounded-tr text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            onClick={() => onChange(clamp(value + increment))}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            className="flex-1 flex items-center justify-center hover:bg-accent rounded-br text-muted-foreground hover:text-foreground border-t border-input disabled:pointer-events-none disabled:opacity-50"
            onClick={() => onChange(clamp(value - increment))}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }
);
NumberStepper.displayName = "NumberStepper";

export { NumberStepper };
