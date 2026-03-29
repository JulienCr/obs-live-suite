"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocketChannel } from "./useWebSocketChannel";
import { queryKeys } from "@/lib/queries/queryKeys";
import { CLIENT_ID } from "@/lib/utils/clientId";
import type { DataChangedEvent, SyncEntity } from "@/lib/models/DataSyncEvents";

const ENTITY_QUERY_KEYS: Record<SyncEntity, readonly string[]> = {
  guests: queryKeys.guests.all,
  posters: queryKeys.posters.all,
  profiles: queryKeys.profiles.all,
  themes: queryKeys.themes.all,
  textPresets: queryKeys.textPresets.all,
  titleReveals: queryKeys.titleReveals.all,
  settings: queryKeys.settings.all,
};

/**
 * Listens for data-changed events on the system WebSocket channel
 * and invalidates the corresponding React Query cache.
 * Ignores events originating from the current tab (same clientId).
 */
export function useDataSync(): void {
  const queryClient = useQueryClient();

  const onMessage = useCallback(
    (data: unknown) => {
      const event = data as DataChangedEvent;
      if (event.type !== "data-changed") return;
      if (event.clientId === CLIENT_ID) return;

      const queryKey = ENTITY_QUERY_KEYS[event.entity];
      if (!queryKey) return;

      console.log(
        `[DataSync] Invalidating ${event.entity} (from ${event.clientId.slice(0, 8)})`
      );
      queryClient.invalidateQueries({ queryKey });
    },
    [queryClient]
  );

  useWebSocketChannel("system", onMessage);
}
