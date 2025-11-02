/**
 * Database model type definitions
 */

export interface DbGuest {
  id: string;
  displayName: string;
  subtitle: string | null;
  accentColor: string;
  avatarUrl: string | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbPoster {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  duration: number | null;
  tags: string[];
  profileIds: string[];
  metadata?: Record<string, unknown>;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbProfile {
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
  audioSettings: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    accent: string;
    surface: string;
    text: string;
    success: string;
    warn: string;
  };
  lowerThirdTemplate: string;
  lowerThirdFont: {
    family: string;
    size: number;
    weight: number;
  };
  lowerThirdLayout: {
    x: number;
    y: number;
    scale: number;
  };
  countdownStyle: string;
  countdownFont: {
    family: string;
    size: number;
    weight: number;
  };
  countdownLayout: {
    x: number;
    y: number;
    scale: number;
  };
  posterLayout: {
    x: number;
    y: number;
    scale: number;
  };
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbPlugin {
  id: string;
  name: string;
  kind: string;
  localVersion: string | null;
  paths: string[];
  registryId: string | null;
  latestVersion: string | null;
  releaseUrl: string | null;
  releaseNotes: string | null;
  updateStatus: string;
  isIgnored: boolean;
  isWatched: boolean;
  lastChecked: Date | null;
  compatibleOBSVersions: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbPreset {
  id: string;
  name: string;
  type: string;
  payload: Record<string, unknown>;
  profileId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbMacro {
  id: string;
  name: string;
  description: string | null;
  actions: Array<Record<string, unknown>>;
  hotkey: string | null;
  profileId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Input types for creation (dates can be optional)
export type DbGuestInput = Omit<DbGuest, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type DbPosterInput = Omit<DbPoster, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type DbProfileInput = Omit<DbProfile, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type DbThemeInput = Omit<DbTheme, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

// Update types (all fields optional except dates)
export type DbGuestUpdate = Partial<Omit<DbGuest, 'id' | 'createdAt'>> & {
  updatedAt?: Date;
};

export type DbPosterUpdate = Partial<Omit<DbPoster, 'id' | 'createdAt'>> & {
  updatedAt?: Date;
};

export type DbProfileUpdate = Partial<Omit<DbProfile, 'id' | 'createdAt'>> & {
  updatedAt?: Date;
};

export type DbThemeUpdate = Partial<Omit<DbTheme, 'id' | 'createdAt'>> & {
  updatedAt?: Date;
};
