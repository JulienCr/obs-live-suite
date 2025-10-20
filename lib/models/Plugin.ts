import { z } from "zod";

/**
 * Plugin kind types
 */
export enum PluginKind {
  PLUGIN = "plugin",
  SCRIPT = "script",
}

/**
 * Plugin update status
 */
export enum UpdateStatus {
  UP_TO_DATE = "up_to_date",
  UPDATE_AVAILABLE = "update_available",
  UNKNOWN = "unknown",
  IGNORED = "ignored",
}

/**
 * Plugin schema
 */
export const pluginSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Plugin name is required"),
  kind: z.nativeEnum(PluginKind),
  localVersion: z.string().optional(),
  paths: z.array(z.string()).min(1),
  registryId: z.string().optional(),
  latestVersion: z.string().optional(),
  releaseUrl: z.string().url().optional(),
  releaseNotes: z.string().optional(),
  updateStatus: z.nativeEnum(UpdateStatus).default(UpdateStatus.UNKNOWN),
  isIgnored: z.boolean().default(false),
  isWatched: z.boolean().default(false),
  lastChecked: z.date().optional(),
  compatibleOBSVersions: z.array(z.string()).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Plugin type inferred from schema
 */
export type Plugin = z.infer<typeof pluginSchema>;

/**
 * Create plugin input schema
 */
export const createPluginSchema = pluginSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePluginInput = z.infer<typeof createPluginSchema>;

/**
 * Update plugin input schema
 */
export const updatePluginSchema = pluginSchema.partial().required({ id: true });

export type UpdatePluginInput = z.infer<typeof updatePluginSchema>;

/**
 * Plugin class with business logic
 */
export class PluginModel {
  private data: Plugin;

  constructor(data: Plugin) {
    this.data = pluginSchema.parse(data);
  }

  /**
   * Get plugin ID
   */
  getId(): string {
    return this.data.id;
  }

  /**
   * Get plugin name
   */
  getName(): string {
    return this.data.name;
  }

  /**
   * Get plugin kind
   */
  getKind(): PluginKind {
    return this.data.kind;
  }

  /**
   * Get local version
   */
  getLocalVersion(): string | undefined {
    return this.data.localVersion;
  }

  /**
   * Get latest version
   */
  getLatestVersion(): string | undefined {
    return this.data.latestVersion;
  }

  /**
   * Get update status
   */
  getUpdateStatus(): UpdateStatus {
    return this.data.updateStatus;
  }

  /**
   * Check if update is available
   */
  hasUpdate(): boolean {
    return this.data.updateStatus === UpdateStatus.UPDATE_AVAILABLE;
  }

  /**
   * Check if plugin is ignored
   */
  isIgnoredPlugin(): boolean {
    return this.data.isIgnored;
  }

  /**
   * Check if plugin is watched
   */
  isWatchedPlugin(): boolean {
    return this.data.isWatched;
  }

  /**
   * Mark as ignored
   */
  ignore(): void {
    this.data.isIgnored = true;
    this.data.updatedAt = new Date();
  }

  /**
   * Unmark as ignored
   */
  unignore(): void {
    this.data.isIgnored = false;
    this.data.updatedAt = new Date();
  }

  /**
   * Add to watchlist
   */
  watch(): void {
    this.data.isWatched = true;
    this.data.updatedAt = new Date();
  }

  /**
   * Remove from watchlist
   */
  unwatch(): void {
    this.data.isWatched = false;
    this.data.updatedAt = new Date();
  }

  /**
   * Update plugin data
   */
  update(updates: Partial<Omit<Plugin, "id" | "createdAt">>): void {
    this.data = {
      ...this.data,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Plugin {
    return { ...this.data };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: unknown): PluginModel {
    const parsed = pluginSchema.parse(data);
    return new PluginModel(parsed);
  }
}

