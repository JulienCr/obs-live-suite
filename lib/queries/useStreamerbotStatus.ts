"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/utils/ClientFetch";
import { getBackendUrl } from "@/lib/utils/websocket";
import { queryKeys } from "./queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/config/Constants";
import type {
  StreamerbotConnectionStatus,
  StreamerbotConnectionError,
} from "@/lib/models/StreamerbotChat";

interface StreamerbotStatusResponse {
  status: StreamerbotConnectionStatus;
  error?: StreamerbotConnectionError;
  lastEventTime?: number;
}

export interface UseStreamerbotStatusOptions {
  enabled?: boolean;
}

export function useStreamerbotStatus(options: UseStreamerbotStatusOptions = {}) {
  const { enabled = true } = options;

  const query = useQuery<StreamerbotStatusResponse>({
    queryKey: queryKeys.streamerbot.status(),
    queryFn: () => apiGet<StreamerbotStatusResponse>(getBackendUrl() + "/api/streamerbot-chat/status"),
    staleTime: QUERY_STALE_TIMES.FAST,
    refetchInterval: 10000,
    enabled,
  });

  const lastEventTime = query.data?.lastEventTime
    ? new Date(query.data.lastEventTime).toISOString()
    : null;

  return {
    status: query.data?.status,
    error: query.data?.error?.message ?? null,
    lastEventTime,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
