"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/utils/ClientFetch";
import { queryKeys } from "./queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/config/Constants";

export interface Profile {
  id: string;
  name: string;
  description: string | null;
  themeId: string;
  dskSourceName: string;
  defaultScene: string | null;
  posterRotation: Array<{
    posterId: string;
    duration: number;
    order: number;
  }>;
  audioSettings: {
    countdownCueEnabled: boolean;
    countdownCueAt: number;
    actionSoundsEnabled: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSummary {
  id: string;
  name: string;
  isActive: boolean;
}

interface ProfilesResponse {
  profiles: Profile[];
}

interface ProfileResponse {
  profile: Profile;
}

// Use centralized stale time from Constants

export function useProfiles() {
  const queryClient = useQueryClient();

  const invalidateProfiles = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.profiles.list(),
    queryFn: async () => {
      const response = await apiGet<ProfilesResponse>("/api/profiles");
      return response.profiles;
    },
    staleTime: QUERY_STALE_TIMES.SLOW,
  });

  const activateProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const response = await apiPost<ProfileResponse>(
        `/api/profiles/${profileId}/activate`
      );
      return response.profile;
    },
    onSuccess: invalidateProfiles,
  });

  const profiles = data ?? [];
  const activeProfile = profiles.find((p) => p.isActive);

  return {
    profiles,
    activeProfile,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    activateProfile: activateProfileMutation.mutate,
    isActivating: activateProfileMutation.isPending,
    activateProfileAsync: activateProfileMutation.mutateAsync,
  };
}
