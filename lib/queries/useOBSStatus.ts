"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/utils/ClientFetch";
import { queryKeys } from "./queryKeys";

export interface OBSStatus {
  connected: boolean;
  currentScene: string | null;
  isStreaming: boolean;
  isRecording: boolean;
  isVirtualCamActive?: boolean;
  fps?: number;
  streamTime?: number;
  recordTime?: number;
}

export interface UseOBSStatusOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

const DEFAULT_STATUS: OBSStatus = {
  connected: false,
  currentScene: null,
  isStreaming: false,
  isRecording: false,
};

export function useOBSStatus(options: UseOBSStatusOptions = {}) {
  const { refetchInterval = 5000, enabled = true } = options;

  const query = useQuery({
    queryKey: queryKeys.obs.status(),
    queryFn: () => apiGet<OBSStatus>("/api/obs/status"),
    refetchInterval,
    enabled,
    placeholderData: (previousData) => previousData,
  });

  const status = query.data ?? DEFAULT_STATUS;

  return {
    data: query.data,
    isConnected: status.connected,
    isOnAir: status.isStreaming || status.isRecording,
    currentScene: status.currentScene,
    isStreaming: status.isStreaming,
    isRecording: status.isRecording,
    isVirtualCamActive: status.isVirtualCamActive ?? false,
    fps: status.fps ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
