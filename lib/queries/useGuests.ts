"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/utils/ClientFetch";
import { queryKeys, GuestFilterOptions } from "./queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/config/Constants";

export interface Guest {
  id: string;
  displayName: string;
  subtitle: string | null;
  accentColor: string;
  avatarUrl: string | null;
  chatMessage: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuestSummary {
  id: string;
  displayName: string;
  subText: string | null;
  avatarUrl: string | null;
  isEnabled: boolean;
}

interface GuestsResponse {
  guests: Guest[];
}

interface GuestResponse {
  guest: Guest;
}

export interface CreateGuestInput {
  displayName: string;
  subtitle?: string | null;
  accentColor?: string;
  avatarUrl?: string | null;
  chatMessage?: string | null;
  isEnabled?: boolean;
}

export interface UpdateGuestInput {
  displayName?: string;
  subtitle?: string | null;
  accentColor?: string;
  avatarUrl?: string | null;
  chatMessage?: string | null;
  isEnabled?: boolean;
}

export interface UseGuestsOptions {
  enabled?: boolean;
}

// Use centralized stale time from Constants

function buildGuestsEndpoint(options?: UseGuestsOptions): string {
  if (options?.enabled !== undefined) {
    return `/api/assets/guests?enabled=${options.enabled}`;
  }
  return "/api/assets/guests";
}

export function useGuests(options?: UseGuestsOptions) {
  const queryClient = useQueryClient();

  const filters: GuestFilterOptions | undefined =
    options?.enabled !== undefined ? { enabled: options.enabled } : undefined;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.guests.list(filters),
    queryFn: async () => {
      const response = await apiGet<GuestsResponse>(buildGuestsEndpoint(options));
      return response.guests;
    },
    staleTime: QUERY_STALE_TIMES.NORMAL,
  });

  const invalidateGuests = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.guests.all });

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const response = await apiPatch<GuestResponse>(`/api/assets/guests/${id}`, {
        isEnabled,
      });
      return response.guest;
    },
    onSuccess: invalidateGuests,
  });

  const createGuestMutation = useMutation({
    mutationFn: async (input: CreateGuestInput) => {
      const response = await apiPost<GuestResponse>("/api/assets/guests", input);
      return response.guest;
    },
    onSuccess: invalidateGuests,
  });

  const updateGuestMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateGuestInput & { id: string }) => {
      const response = await apiPatch<GuestResponse>(
        `/api/assets/guests/${id}`,
        updates
      );
      return response.guest;
    },
    onSuccess: invalidateGuests,
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDelete<{ success: boolean }>(`/api/assets/guests/${id}`);
      return id;
    },
    onSuccess: invalidateGuests,
  });

  return {
    guests: data ?? [],
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    toggleEnabled: toggleEnabledMutation.mutate,
    createGuest: createGuestMutation.mutate,
    updateGuest: updateGuestMutation.mutate,
    deleteGuest: deleteGuestMutation.mutate,
    isToggling: toggleEnabledMutation.isPending,
    isCreating: createGuestMutation.isPending,
    isUpdating: updateGuestMutation.isPending,
    isDeleting: deleteGuestMutation.isPending,
    toggleEnabledAsync: toggleEnabledMutation.mutateAsync,
    createGuestAsync: createGuestMutation.mutateAsync,
    updateGuestAsync: updateGuestMutation.mutateAsync,
    deleteGuestAsync: deleteGuestMutation.mutateAsync,
  };
}
