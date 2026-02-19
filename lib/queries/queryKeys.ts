export interface GuestFilterOptions {
  enabled?: boolean;
}

export interface TextPresetFilterOptions {
  enabled?: boolean;
}

export const queryKeys = {
  obs: {
    all: ["obs"] as const,
    status: () => [...queryKeys.obs.all, "status"] as const,
  },

  guests: {
    all: ["guests"] as const,
    list: (filters?: GuestFilterOptions) =>
      [...queryKeys.guests.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.guests.all, "detail", id] as const,
  },

  textPresets: {
    all: ["textPresets"] as const,
    list: (filters?: TextPresetFilterOptions) =>
      [...queryKeys.textPresets.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.textPresets.all, "detail", id] as const,
  },

  profiles: {
    all: ["profiles"] as const,
    list: () => [...queryKeys.profiles.all, "list"] as const,
    detail: (id: string) => [...queryKeys.profiles.all, "detail", id] as const,
  },

  streamerbot: {
    all: ["streamerbot"] as const,
    status: () => [...queryKeys.streamerbot.all, "status"] as const,
    history: () => [...queryKeys.streamerbot.all, "history"] as const,
  },

  posters: {
    all: ["posters"] as const,
    list: (filters?: { enabled?: boolean }) =>
      [...queryKeys.posters.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.posters.all, "detail", id] as const,
  },

  themes: {
    all: ["themes"] as const,
    list: () => [...queryKeys.themes.all, "list"] as const,
    detail: (id: string) => [...queryKeys.themes.all, "detail", id] as const,
  },

  twitch: {
    all: ["twitch"] as const,
    authStatus: () => [...queryKeys.twitch.all, "authStatus"] as const,
  },

  settings: {
    all: ["settings"] as const,
    byCategory: (category: string) =>
      [...queryKeys.settings.all, category] as const,
  },
} as const;
