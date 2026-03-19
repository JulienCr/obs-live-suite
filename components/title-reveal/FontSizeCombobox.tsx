"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const FONT_SIZE_PRESETS = [20, 30, 40, 50, 60, 70, 80, 100, 120, 150, 200];

interface FontSizeComboboxProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function FontSizeCombobox({ value, onChange, className }: FontSizeComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal", className)}
        >
          {value}px
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-2" align="start" onWheel={(e) => e.stopPropagation()}>
        <Input
          type="number"
          min={10}
          max={300}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="text-xs h-7 mb-2"
          autoFocus
        />
        <div className="overflow-y-auto overscroll-contain space-y-0.5" style={{ maxHeight: 180 }}>
          {FONT_SIZE_PRESETS.map((size) => (
            <button
              key={size}
              type="button"
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1 text-sm hover:bg-accent",
                value === size && "bg-accent"
              )}
              onClick={() => {
                onChange(size);
                setOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-3.5 w-3.5", value === size ? "opacity-100" : "opacity-0")} />
              {size}px
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
