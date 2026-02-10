"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/utils/ClientFetch";
import { queryKeys } from "./queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/config/Constants";

interface OverlaySettings {
  lowerThirdDuration: number;
}

interface OverlaySettingsResponse {
  settings?: OverlaySettings;
}

const DEFAULT_LOWER_THIRD_DURATION = 8;

export function useOverlaySettings() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.settings.byCategory("overlay"),
    queryFn: () => apiGet<OverlaySettingsResponse>("/api/settings/overlay"),
    staleTime: QUERY_STALE_TIMES.VERY_SLOW,
  });

  return {
    lowerThirdDuration:
      data?.settings?.lowerThirdDuration ?? DEFAULT_LOWER_THIRD_DURATION,
    isLoading,
  };
}
