import type {
  StreamerbotConnectionSettings,
  ChatPlatform,
  ChatEventType,
  MessagePart,
  ChatMessageMetadata,
} from "./StreamerbotChat";

/**
 * Database model type definitions
 */

export interface DbGuest {
  id: string;
  displayName: string;
  subtitle: string | null;
  accentColor: string;
  avatarUrl: string | null;
  chatMessage: string | null;
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
  chatMessage: string | null;
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
  /** @deprecated Use streamerbotConnection instead */
  twitchChatUrl: string | null;
  quickReplies: string[];
  canSendCustomMessages: boolean;
  streamerbotConnection: StreamerbotConnectionSettings | null;
  allowPresenterToSendMessage: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbCueMessage {
  id: string;
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

export type DbRoomInput = Omit<DbRoom, 'createdAt' | 'updatedAt' | 'streamerbotConnection'> & {
  createdAt?: Date;
  updatedAt?: Date;
  streamerbotConnection?: string | null; // JSON string for input
};

export type DbRoomUpdate = Partial<Omit<DbRoom, 'id' | 'createdAt' | 'streamerbotConnection'>> & {
  updatedAt?: Date;
  streamerbotConnection?: string | null; // JSON string for update
};

export type DbCueMessageInput = Omit<DbCueMessage, 'createdAt' | 'updatedAt'> & {
  createdAt?: number;
  updatedAt?: number;
};

export type DbCueMessageUpdate = Partial<Omit<DbCueMessage, 'id' | 'createdAt'>> & {
  updatedAt?: number;
};

// Streamerbot Chat Message (global rolling buffer)
export interface DbStreamerbotChatMessage {
  id: string;
  timestamp: number;
  platform: ChatPlatform;
  eventType: ChatEventType;
  channel: string | null;
  username: string;
  displayName: string;
  message: string;
  parts: MessagePart[] | null;
  metadata: ChatMessageMetadata | null;
  createdAt: number;
}

export type DbStreamerbotChatMessageInput = Omit<DbStreamerbotChatMessage, 'createdAt'> & {
  createdAt?: number;
};

// Panel Colors (dashboard panel customization)
export interface DbPanelColor {
  id: string;
  panelId: string;
  scheme: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DbPanelColorInput = Omit<DbPanelColor, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type DbPanelColorUpdate = Partial<Omit<DbPanelColor, 'id' | 'panelId' | 'createdAt'>> & {
  updatedAt?: Date;
};

// Workspaces (dashboard layout configurations)
export interface DbWorkspace {
  id: string;
  name: string;
  description: string | null;
  layoutJson: string; // Dockview toJSON() serialized layout
  panelColors: Record<string, string>; // { panelId: colorScheme }
  isDefault: boolean;
  isBuiltIn: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type DbWorkspaceInput = Omit<DbWorkspace, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type DbWorkspaceUpdate = Partial<Omit<DbWorkspace, 'id' | 'createdAt' | 'isBuiltIn'>> & {
  updatedAt?: Date;
};

// Summary type for dropdowns (without heavy layoutJson)
export interface DbWorkspaceSummary {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isBuiltIn: boolean;
  sortOrder: number;
}
