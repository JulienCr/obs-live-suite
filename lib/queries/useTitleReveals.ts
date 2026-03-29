"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/utils/ClientFetch";
import { queryKeys } from "./queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/config/Constants";
import type { TitleLine } from "@/lib/models/TitleReveal";
import type { TitleRevealPlayPayload } from "@/lib/models/OverlayEvents";

/** Re-export TitleLine as TitleRevealLine for backward compat */
export type TitleRevealLine = TitleLine;

export interface TitleReveal {
  id: string;
  name: string;
  lines: TitleLine[];
  logoUrl: string | null;
  fontFamily: string;
  fontSize: number;
  rotation: number;
  colorText: string;
  colorGhostBlue: string;
  colorGhostNavy: string;
  duration: number;
  soundUrl: string | null;
  midiEnabled: boolean;
  midiChannel: number;
  midiCc: number;
  midiValue: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface TitleRevealsResponse {
  titleReveals: TitleReveal[];
}

interface TitleRevealResponse {
  titleReveal: TitleReveal;
}

export interface CreateTitleRevealInput {
  name: string;
  lines: TitleLine[];
  logoUrl?: string | null;
  fontFamily?: string;
  fontSize?: number;
  rotation?: number;
  colorText?: string;
  colorGhostBlue?: string;
  colorGhostNavy?: string;
  duration?: number;
  soundUrl?: string | null;
  midiEnabled?: boolean;
  midiChannel?: number;
  midiCc?: number;
  midiValue?: number;
  sortOrder?: number;
}

export interface UpdateTitleRevealInput {
  name?: string;
  lines?: TitleLine[];
  logoUrl?: string | null;
  fontFamily?: string;
  fontSize?: number;
  rotation?: number;
  colorText?: string;
  colorGhostBlue?: string;
  colorGhostNavy?: string;
  duration?: number;
  soundUrl?: string | null;
  midiEnabled?: boolean;
  midiChannel?: number;
  midiCc?: number;
  midiValue?: number;
  sortOrder?: number;
}

export function useTitleReveals() {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.titleReveals.list(),
    queryFn: async () => {
      const response = await apiGet<TitleRevealsResponse>("/api/assets/title-reveals");
      return response.titleReveals;
    },
    staleTime: QUERY_STALE_TIMES.NORMAL,
  });

  const invalidateTitleReveals = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.titleReveals.all });

  const createTitleRevealMutation = useMutation({
    mutationFn: async (input: CreateTitleRevealInput) => {
      const response = await apiPost<TitleRevealResponse>("/api/assets/title-reveals", input);
      return response.titleReveal;
    },
    onSuccess: invalidateTitleReveals,
  });

  const updateTitleRevealMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTitleRevealInput & { id: string }) => {
      const response = await apiPatch<TitleRevealResponse>(
        `/api/assets/title-reveals/${id}`,
        updates
      );
      return response.titleReveal;
    },
    onSuccess: invalidateTitleReveals,
  });

  const deleteTitleRevealMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDelete<{ success: boolean }>(`/api/assets/title-reveals/${id}`);
      return id;
    },
    onSuccess: invalidateTitleReveals,
  });

  const playTitleRevealMutation = useMutation({
    mutationFn: async (payload: TitleRevealPlayPayload) => {
      await apiPost("/api/overlays/title-reveal", { action: "play", payload });
    },
  });

  const hideTitleRevealMutation = useMutation({
    mutationFn: async () => {
      await apiPost("/api/overlays/title-reveal", { action: "hide" });
    },
  });

  const uploadLogo = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiPost<{ url: string }>(
      "/api/assets/title-reveals/upload-logo",
      formData
    );
    return response.url;
  };

  const uploadSound = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiPost<{ url: string }>(
      "/api/assets/title-reveals/upload-sound",
      formData
    );
    return response.url;
  };

  return {
    titleReveals: data ?? [],
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    createTitleReveal: createTitleRevealMutation.mutate,
    updateTitleReveal: updateTitleRevealMutation.mutate,
    deleteTitleReveal: deleteTitleRevealMutation.mutate,
    playTitleReveal: playTitleRevealMutation.mutate,
    hideTitleReveal: hideTitleRevealMutation.mutate,
    uploadLogo,
    uploadSound,
    isCreating: createTitleRevealMutation.isPending,
    isUpdating: updateTitleRevealMutation.isPending,
    isDeleting: deleteTitleRevealMutation.isPending,
    isPlaying: playTitleRevealMutation.isPending,
    isHiding: hideTitleRevealMutation.isPending,
    createTitleRevealAsync: createTitleRevealMutation.mutateAsync,
    updateTitleRevealAsync: updateTitleRevealMutation.mutateAsync,
    deleteTitleRevealAsync: deleteTitleRevealMutation.mutateAsync,
    playTitleRevealAsync: playTitleRevealMutation.mutateAsync,
    hideTitleRevealAsync: hideTitleRevealMutation.mutateAsync,
  };
}
