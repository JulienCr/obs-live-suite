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
  description: string | null;
  source: string | null;
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
  lowerThirdAnimation: {
    timing: {
      logoFadeDuration: number;
      logoScaleDuration: number;
      flipDuration: number;
      flipDelay: number;
      barAppearDelay: number;
      barExpandDuration: number;
      textAppearDelay: number;
      textFadeDuration: number;
    };
    styles: {
      barBorderRadius: number;
      barMinWidth: number;
      avatarBorderWidth: number;
      avatarBorderColor: string;
      freeTextMaxWidth?: {
        left: number;
        right: number;
        center: number;
      };
    };
    colors?: {
      titleColor?: string;
      subtitleColor?: string;
      barBgColor?: string;
    };
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

export interface DbRoom {
  id: string;
  name: string;
  vdoNinjaUrl: string | null;
  twitchChatUrl: string | null;
  quickReplies: string[];
  canSendCustomMessages: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbCueMessage {
  id: string;
  roomId: string;
  type: string;
  fromRole: string;
  severity: string | null;
  title: string | null;
  body: string | null;
  pinned: boolean;
  actions: string[];
  countdownPayload: Record<string, unknown> | null;
  contextPayload: Record<string, unknown> | null;
  questionPayload: Record<string, unknown> | null;
  seenBy: string[];
  ackedBy: string[];
  resolvedAt: number | null;
  resolvedBy: string | null;
  createdAt: number;
  updatedAt: number;
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

export type DbRoomInput = Omit<DbRoom, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type DbRoomUpdate = Partial<Omit<DbRoom, 'id' | 'createdAt'>> & {
  updatedAt?: Date;
};

export type DbCueMessageInput = Omit<DbCueMessage, 'createdAt' | 'updatedAt'> & {
  createdAt?: number;
  updatedAt?: number;
};

export type DbCueMessageUpdate = Partial<Omit<DbCueMessage, 'id' | 'roomId' | 'createdAt'>> & {
  updatedAt?: number;
};
