"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Loader2, Search, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiGet, isClientFetchError } from "@/lib/utils/ClientFetch";
import type { TwitchCategory } from "@/lib/models/Twitch";

interface TwitchCategoryPickerProps {
  value?: TwitchCategory | null;
  onChange: (category: TwitchCategory | null) => void;
  disabled?: boolean;
}

/**
 * TwitchCategoryPicker - Combobox for selecting Twitch categories
 *
 * Features:
 * - Search Twitch categories via API
 * - Debounced search (300ms)
 * - Display box art thumbnails
 * - Loading and empty states
 */
export function TwitchCategoryPicker({
  value,
  onChange,
  disabled = false,
}: TwitchCategoryPickerProps) {
  const t = useTranslations("dashboard.twitch");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<TwitchCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search categories with debounce
  const searchCategories = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setCategories([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiGet<{
        success: boolean;
        data: TwitchCategory[];
      }>(`/api/twitch/categories?query=${encodeURIComponent(query)}`);

      if (response.success && response.data) {
        setCategories(response.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      if (isClientFetchError(err)) {
        setError(err.errorMessage);
      } else {
        setError("Failed to search categories");
      }
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchCategories(search);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, searchCategories]);

  // Format box art URL with size
  const formatBoxArtUrl = (url?: string): string => {
    if (!url) return "";
    // Twitch box art URLs use {width}x{height} placeholders
    return url.replace("{width}", "52").replace("{height}", "72");
  };

  const handleSelect = (category: TwitchCategory) => {
    onChange(category);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            {value ? (
              <>
                {value.boxArtUrl && (
                  <img
                    src={formatBoxArtUrl(value.boxArtUrl)}
                    alt=""
                    className="h-6 w-[17px] rounded object-cover"
                  />
                )}
                <span className="truncate">{value.name}</span>
              </>
            ) : (
              <>
                <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("categoryPicker.placeholder")}
                </span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={t("categoryPicker.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </div>
          <CommandList>
            {!loading && search.length >= 2 && categories.length === 0 && (
              <CommandEmpty>{t("categoryPicker.noResults")}</CommandEmpty>
            )}
            {search.length < 2 && !loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("categoryPicker.typeToSearch")}
              </div>
            )}
            {error && (
              <div className="py-3 px-4 text-sm text-destructive">{error}</div>
            )}
            {categories.length > 0 && (
              <CommandGroup>
                {categories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.id}
                    onSelect={() => handleSelect(category)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {category.boxArtUrl ? (
                      <img
                        src={formatBoxArtUrl(category.boxArtUrl)}
                        alt=""
                        className="h-9 w-[26px] rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-[26px] rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="flex-1 truncate">{category.name}</span>
                    {value?.id === category.id && (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
