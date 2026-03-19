"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { loadGoogleFont } from "@/lib/titleReveal";

/** Popular Google Fonts suitable for title overlays. */
const FONT_PRESETS = [
  "Permanent Marker",
  "Bangers",
  "Bungee",
  "Bungee Shade",
  "Creepster",
  "Fugaz One",
  "Luckiest Guy",
  "Passion One",
  "Paytone One",
  "Press Start 2P",
  "Righteous",
  "Rubik Mono One",
  "Russo One",
  "Special Elite",
  "Titan One",
];

interface FontFamilyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FontFamilyCombobox({ value, onChange, className }: FontFamilyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Preload preset fonts when the popover opens so previews work
  useEffect(() => {
    if (open) {
      for (const font of FONT_PRESETS) {
        loadGoogleFont(font).catch(() => {});
      }
    }
  }, [open]);

  const filtered = search
    ? FONT_PRESETS.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : FONT_PRESETS;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal truncate", className)}
        >
          <span className="truncate">{value}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start" onWheel={(e) => e.stopPropagation()}>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search or type font name..."
          className="text-xs h-7 mb-2"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && search.trim()) {
              onChange(search.trim());
              setSearch("");
              setOpen(false);
            }
          }}
        />
        <div className="overflow-y-auto overscroll-contain space-y-0.5" style={{ maxHeight: 220 }}>
          {filtered.map((font) => (
            <button
              key={font}
              type="button"
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                value === font && "bg-accent"
              )}
              style={{ fontFamily: `"${font}", cursive` }}
              onClick={() => {
                onChange(font);
                setSearch("");
                setOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", value === font ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{font}</span>
            </button>
          ))}
          {filtered.length === 0 && search.trim() && (
            <button
              type="button"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-muted-foreground"
              onClick={() => {
                onChange(search.trim());
                setSearch("");
                setOpen(false);
              }}
            >
              Use &ldquo;{search.trim()}&rdquo;
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
