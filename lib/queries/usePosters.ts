"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/utils/ClientFetch";
import { queryKeys } from "./queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/config/Constants";

export interface Poster {
  id: string;
  title: string;
  description?: string;
  source?: string;
  fileUrl: string;
  type: "image" | "video" | "youtube";
  tags: string[];
  chatMessage?: string;
  isEnabled?: boolean;
  createdAt?: string;
  duration?: number | null;
  metadata?: Record<string, unknown>;
  parentPosterId?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  thumbnailUrl?: string | null;
}

interface PostersResponse {
  posters: Poster[];
}

interface PosterResponse {
  poster: Poster;
}

export interface CreatePosterInput {
  title: string;
  fileUrl: string;
  type: "image" | "video" | "youtube";
  tags?: string[];
  description?: string;
  source?: string;
  chatMessage?: string;
  isEnabled?: boolean;
  duration?: number | null;
  metadata?: Record<string, unknown>;
  parentPosterId?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  thumbnailUrl?: string | null;
}

export interface UpdatePosterInput {
  title?: string;
  description?: string;
  source?: string;
  fileUrl?: string;
  type?: "image" | "video" | "youtube";
  tags?: string[];
  chatMessage?: string;
  isEnabled?: boolean;
  duration?: number | null;
  metadata?: Record<string, unknown>;
  parentPosterId?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  thumbnailUrl?: string | null;
}

export function usePosters() {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.posters.list(),
    queryFn: async () => {
      const response = await apiGet<PostersResponse>("/api/assets/posters");
      return response.posters;
    },
    staleTime: QUERY_STALE_TIMES.NORMAL,
  });

  const invalidatePosters = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.posters.all });

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const response = await apiPatch<PosterResponse>(`/api/assets/posters/${id}`, {
        isEnabled,
      });
      return response.poster;
    },
    onSuccess: invalidatePosters,
  });

  const createPosterMutation = useMutation({
    mutationFn: async (input: CreatePosterInput) => {
      const response = await apiPost<PosterResponse>("/api/assets/posters", input);
      return response.poster;
    },
    onSuccess: invalidatePosters,
  });

  const updatePosterMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePosterInput & { id: string }) => {
      const response = await apiPatch<PosterResponse>(
        `/api/assets/posters/${id}`,
        updates
      );
      return response.poster;
    },
    onSuccess: invalidatePosters,
  });

  const deletePosterMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDelete<{ success: boolean }>(`/api/assets/posters/${id}`);
      return id;
    },
    onSuccess: invalidatePosters,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiPost<{ success: boolean; deleted: number }>(
        "/api/assets/posters/bulk",
        { ids }
      );
      return response;
    },
    onSuccess: invalidatePosters,
  });

  return {
    posters: data ?? [],
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    toggleEnabled: toggleEnabledMutation.mutate,
    createPoster: createPosterMutation.mutate,
    updatePoster: updatePosterMutation.mutate,
    deletePoster: deletePosterMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    isToggling: toggleEnabledMutation.isPending,
    isCreating: createPosterMutation.isPending,
    isUpdating: updatePosterMutation.isPending,
    isDeleting: deletePosterMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    toggleEnabledAsync: toggleEnabledMutation.mutateAsync,
    createPosterAsync: createPosterMutation.mutateAsync,
    updatePosterAsync: updatePosterMutation.mutateAsync,
    deletePosterAsync: deletePosterMutation.mutateAsync,
    bulkDeleteAsync: bulkDeleteMutation.mutateAsync,
  };
}
