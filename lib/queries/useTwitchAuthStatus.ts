"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/utils/ClientFetch";
import { queryKeys } from "./queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/config/Constants";

interface TwitchSettingsResponse {
  hasCredentials: boolean;
  isConnected: boolean;
  authStatus: {
    state: string;
  };
}

export function useTwitchAuthStatus() {
  const query = useQuery<TwitchSettingsResponse>({
    queryKey: queryKeys.twitch.authStatus(),
    queryFn: () => apiGet<TwitchSettingsResponse>("/api/settings/twitch"),
    staleTime: QUERY_STALE_TIMES.FAST,
    refetchInterval: 30000,
  });

  return {
    isConfigured: query.data?.hasCredentials ?? false,
    isConnected: query.data?.authStatus?.state === "authorized",
    isLoading: query.isLoading,
  };
}
