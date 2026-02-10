"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/utils/ClientFetch";
import { queryKeys, TextPresetFilterOptions } from "./queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/config/Constants";

export interface TextPreset {
  id: string;
  name: string;
  body: string;
  side: "left" | "right" | "center";
  imageUrl: string | null;
  imageAlt: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TextPresetsResponse {
  textPresets: TextPreset[];
}

interface TextPresetResponse {
  textPreset: TextPreset;
}

export interface CreateTextPresetInput {
  name: string;
  body: string;
  side?: "left" | "right" | "center";
  imageUrl?: string | null;
  imageAlt?: string | null;
  isEnabled?: boolean;
}

export interface UpdateTextPresetInput {
  name?: string;
  body?: string;
  side?: "left" | "right" | "center";
  imageUrl?: string | null;
  imageAlt?: string | null;
  isEnabled?: boolean;
}

export interface UseTextPresetsOptions {
  enabled?: boolean;
}

function buildTextPresetsEndpoint(options?: UseTextPresetsOptions): string {
  if (options?.enabled !== undefined) {
    return `/api/assets/text-presets?enabled=${options.enabled}`;
  }
  return "/api/assets/text-presets";
}

export function useTextPresets(options?: UseTextPresetsOptions) {
  const queryClient = useQueryClient();

  const filters: TextPresetFilterOptions | undefined =
    options?.enabled !== undefined ? { enabled: options.enabled } : undefined;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.textPresets.list(filters),
    queryFn: async () => {
      const response = await apiGet<TextPresetsResponse>(buildTextPresetsEndpoint(options));
      return response.textPresets;
    },
    staleTime: QUERY_STALE_TIMES.NORMAL,
  });

  const invalidateTextPresets = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.textPresets.all });

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const response = await apiPatch<TextPresetResponse>(`/api/assets/text-presets/${id}`, {
        isEnabled,
      });
      return response.textPreset;
    },
    onSuccess: invalidateTextPresets,
  });

  const createTextPresetMutation = useMutation({
    mutationFn: async (input: CreateTextPresetInput) => {
      const response = await apiPost<TextPresetResponse>("/api/assets/text-presets", input);
      return response.textPreset;
    },
    onSuccess: invalidateTextPresets,
  });

  const updateTextPresetMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTextPresetInput & { id: string }) => {
      const response = await apiPatch<TextPresetResponse>(
        `/api/assets/text-presets/${id}`,
        updates
      );
      return response.textPreset;
    },
    onSuccess: invalidateTextPresets,
  });

  const deleteTextPresetMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDelete<{ success: boolean }>(`/api/assets/text-presets/${id}`);
      return id;
    },
    onSuccess: invalidateTextPresets,
  });

  return {
    textPresets: data ?? [],
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    toggleEnabled: toggleEnabledMutation.mutate,
    createTextPreset: createTextPresetMutation.mutate,
    updateTextPreset: updateTextPresetMutation.mutate,
    deleteTextPreset: deleteTextPresetMutation.mutate,
    isToggling: toggleEnabledMutation.isPending,
    isCreating: createTextPresetMutation.isPending,
    isUpdating: updateTextPresetMutation.isPending,
    isDeleting: deleteTextPresetMutation.isPending,
    toggleEnabledAsync: toggleEnabledMutation.mutateAsync,
    createTextPresetAsync: createTextPresetMutation.mutateAsync,
    updateTextPresetAsync: updateTextPresetMutation.mutateAsync,
    deleteTextPresetAsync: deleteTextPresetMutation.mutateAsync,
  };
}
