"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface EnableSearchComboboxProps<T> {
  items: T[];
  onEnable: (id: string) => void;
  getId: (item: T) => string;
  getName: (item: T) => string;
  getIsEnabled: (item: T) => boolean;
  renderItem: (item: T) => React.ReactNode;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  groupHeading?: string;
}

export function EnableSearchCombobox<T>({
  items,
  onEnable,
  getId,
  getName,
  getIsEnabled,
  renderItem,
  label,
  placeholder = "Search to enable...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  groupHeading = "Items",
}: EnableSearchComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredItems = useMemo(() => {
    const searchLower = searchValue.toLowerCase();
    return items
      .filter((item) => getName(item).toLowerCase().includes(searchLower))
      .sort((a, b) => {
        // Sort disabled items first
        const aEnabled = getIsEnabled(a);
        const bEnabled = getIsEnabled(b);
        if (aEnabled !== bEnabled) {
          return aEnabled ? 1 : -1;
        }
        return 0;
      });
  }, [items, searchValue, getName, getIsEnabled]);

  const handleSelect = (item: T) => {
    if (!getIsEnabled(item)) {
      onEnable(getId(item));
    }
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup heading={groupHeading}>
                {filteredItems.map((item) => (
                  <CommandItem
                    key={getId(item)}
                    value={getName(item)}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3"
                  >
                    {renderItem(item)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
