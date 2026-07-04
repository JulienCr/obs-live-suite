"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search, Drama } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { apiGet, isClientFetchError } from "@/lib/utils/ClientFetch";
import { THEATER_DATA } from "@/lib/config/Constants";
import type { TheatreCandidate } from "@/lib/services/TheaterDataResolverService";

const SEARCH_DEBOUNCE_MS = 300;

interface TheatreSearchComboboxProps {
  /** Fired when the user picks a show — the parent creates the poster from it. */
  onSelect: (candidate: TheatreCandidate) => void;
  disabled?: boolean;
}

/**
 * Inline typeahead over the local theater-data base (`GET /api/theatre/search`).
 * Type a title → pick a show → the parent autofills title + accroche + affiche.
 *
 * Purely additive: when the base is unset or the server (WSL, manual) is down the
 * search returns `[]`, so it shows an empty state and never blocks the manual
 * upload path next to it. Mirrors the debounce/thumbnail shape of TwitchCategoryPicker.
 */
export function TheatreSearchCombobox({ onSelect, disabled = false }: TheatreSearchComboboxProps) {
  const t = useTranslations("assets.posters");
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<TheatreCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (q.length < 2) {
        setCandidates([]);
        setError(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await apiGet<{ candidates: TheatreCandidate[] }>(
          `/api/theatre/search?q=${encodeURIComponent(q)}&limit=${THEATER_DATA.SEARCH_LIMIT}`,
          // A little over the server-side abort so the proxy's own timeout wins first.
          { timeout: THEATER_DATA.REQUEST_TIMEOUT_MS + 1000 },
        );
        setCandidates(res.candidates ?? []);
      } catch (err) {
        setError(isClientFetchError(err) ? err.errorMessage : t("theatreSearchError"));
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  // Debounced search effect.
  useEffect(() => {
    const timer = setTimeout(() => runSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, runSearch]);

  const handleSelect = (candidate: TheatreCandidate) => {
    onSelect(candidate);
    setSearch("");
    setCandidates([]);
  };

  const trimmed = search.trim();

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Drama className="h-4 w-4 text-muted-foreground" />
        {t("theatreSearchLabel")}
      </div>
      <Command shouldFilter={false} className="rounded-md border">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={t("theatreSearchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
          {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </div>
        <CommandList>
          {trimmed.length < 2 && !loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("theatreSearchHint")}
            </div>
          )}
          {!loading && trimmed.length >= 2 && candidates.length === 0 && !error && (
            <CommandEmpty>{t("theatreNoResults")}</CommandEmpty>
          )}
          {error && <div className="px-4 py-3 text-sm text-destructive">{error}</div>}
          {candidates.length > 0 && (
            <CommandGroup>
              {candidates.map((c) => (
                <CommandItem
                  key={c.id}
                  value={String(c.id)}
                  onSelect={() => handleSelect(c)}
                  className="flex cursor-pointer items-center gap-3"
                >
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                    <img
                      src={c.posterUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.title}</div>
                    {c.tagline && (
                      <div className="truncate text-xs text-muted-foreground">{c.tagline}</div>
                    )}
                  </div>
                  {c.univers && (
                    <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                      {c.univers}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  );
}
