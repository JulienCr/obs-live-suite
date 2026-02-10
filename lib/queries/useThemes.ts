"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/utils/ClientFetch";
import { queryKeys } from "./queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/config/Constants";
import type { Theme, CreateThemeInput } from "@/lib/models/Theme";

export interface ThemeSummary {
  id: string;
  name: string;
  isGlobal: boolean;
}

interface ThemesResponse {
  themes: Theme[];
}

interface ThemeResponse {
  theme: Theme;
}

export function useThemes() {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.themes.list(),
    queryFn: async () => {
      const response = await apiGet<ThemesResponse>("/api/themes");
      return response.themes;
    },
    staleTime: QUERY_STALE_TIMES.SLOW,
  });

  const invalidateThemes = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.themes.all });

  const createThemeMutation = useMutation({
    mutationFn: async (input: Partial<CreateThemeInput>) => {
      const response = await apiPost<ThemeResponse>("/api/themes", input);
      return response.theme;
    },
    onSuccess: invalidateThemes,
  });

  const updateThemeMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CreateThemeInput> & { id: string }) => {
      const response = await apiPut<ThemeResponse>(`/api/themes/${id}`, updates);
      return response.theme;
    },
    onSuccess: invalidateThemes,
  });

  const deleteThemeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDelete<{ success: boolean }>(`/api/themes/${id}`);
      return id;
    },
    onSuccess: invalidateThemes,
  });

  return {
    themes: data ?? [],
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    createTheme: createThemeMutation.mutate,
    updateTheme: updateThemeMutation.mutate,
    deleteTheme: deleteThemeMutation.mutate,
    isCreating: createThemeMutation.isPending,
    isUpdating: updateThemeMutation.isPending,
    isDeleting: deleteThemeMutation.isPending,
    createThemeAsync: createThemeMutation.mutateAsync,
    updateThemeAsync: updateThemeMutation.mutateAsync,
    deleteThemeAsync: deleteThemeMutation.mutateAsync,
  };
}
