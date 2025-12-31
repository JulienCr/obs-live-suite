"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { StreamerbotChatToolbarProps, SearchBarProps } from "./types";

/**
 * Search bar for filtering messages
 */
export function SearchBar({ searchTerm, onSearchChange }: SearchBarProps) {
  return (
    <div className="flex-shrink-0 px-2 py-1.5 border-b bg-muted/30">
      <Input
        type="search"
        placeholder="Search messages..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-7 text-xs"
      />
    </div>
  );
}

/**
 * Toolbar with settings toggles (auto-scroll, timestamps)
 */
export function StreamerbotChatToolbar({
  preferences,
  onUpdatePreferences,
}: StreamerbotChatToolbarProps) {
  return (
    <div className="flex-shrink-0 px-3 py-1 flex items-center justify-between border-b bg-muted/20">
      <div className="flex items-center gap-2">
        <Switch
          id="autoscroll"
          checked={preferences.autoScroll}
          onCheckedChange={(checked) =>
            onUpdatePreferences({ autoScroll: checked })
          }
          className="scale-75"
        />
        <Label htmlFor="autoscroll" className="text-xs cursor-pointer">
          Auto-scroll
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="timestamps"
          checked={preferences.showTimestamps}
          onCheckedChange={(checked) =>
            onUpdatePreferences({ showTimestamps: checked })
          }
          className="scale-75"
        />
        <Label htmlFor="timestamps" className="text-xs cursor-pointer">
          Timestamps
        </Label>
      </div>
    </div>
  );
}
