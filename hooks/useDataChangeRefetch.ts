"use client";

import { useCallback } from "react";
import { useWebSocketChannel } from "./useWebSocketChannel";
import { CLIENT_ID } from "@/lib/utils/clientId";
import { parseDataChangedEvent, type SyncEntity } from "@/lib/models/DataSyncEvents";

/**
 * Re-run `refetch` when another client OR a server-side process (e.g. the Live
 * Assist backend creating a poster / text preset) changes `entity`.
 *
 * This is the local-state counterpart to {@link useDataSync}: useDataSync
 * invalidates React Query caches, but components that hold their own fetched
 * state (useState + apiGet) get nothing from a query invalidation. They use this
 * instead. Changes originating from THIS tab are skipped (same clientId) — the
 * tab's own mutation already refreshed its state.
 */
export function useDataChangeRefetch(entity: SyncEntity, refetch: () => void): void {
  const onMessage = useCallback(
    (data: unknown) => {
      const event = parseDataChangedEvent(data);
      if (!event) return;
      if (event.entity !== entity) return;
      if (event.clientId === CLIENT_ID) return;
      refetch();
    },
    [entity, refetch],
  );

  useWebSocketChannel("system", onMessage);
}
