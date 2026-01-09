/**
 * TwitchService
 *
 * Manages Twitch stream information with dual-provider support:
 * - Primary: Streamer.bot WebSocket (uses existing StreamerbotGateway)
 * - Fallback: Direct Twitch API (requires OAuth)
 *
 * Features:
 * - Automatic polling every 30 seconds
 * - Provider fallback if primary unavailable
 * - WebSocket broadcast of stream updates
 * - Stream title and category updates
 */

import { Logger } from "../utils/Logger";
import { WebSocketHub } from "./WebSocketHub";
import { SettingsService } from "./SettingsService";
import { StreamerbotGateway } from "../adapters/streamerbot/StreamerbotGateway";
import { TWITCH } from "../config/Constants";
import {
  TwitchStreamInfo,
  TwitchUpdateParams,
  TwitchProviderStatus,
  TwitchProviderType,
  TwitchCategory,
  TWITCH_WS_CHANNEL,
  DEFAULT_TWITCH_SETTINGS,
} from "../models/Twitch";

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

/**
 * Interface for Twitch data providers
 */
interface ITwitchProvider {
  /** Provider identifier */
  readonly providerId: TwitchProviderType;

  /** Check if provider is currently available */
  isAvailable(): boolean;

  /** Get current stream information */
  getStreamInfo(): Promise<TwitchStreamInfo | null>;

  /** Update stream title and/or category */
  updateStreamInfo(params: TwitchUpdateParams): Promise<void>;

  /** Search for categories/games */
  searchCategories?(query: string): Promise<TwitchCategory[]>;
}

// ============================================================================
// STREAMER.BOT PROVIDER
// ============================================================================

/**
 * Twitch provider using Streamer.bot WebSocket
 */
class StreamerbotTwitchProvider implements ITwitchProvider {
  readonly providerId: TwitchProviderType = "streamerbot";
  private gateway: StreamerbotGateway;
  private logger: Logger;

  constructor() {
    this.gateway = StreamerbotGateway.getInstance();
    this.logger = new Logger("StreamerbotTwitchProvider");
  }

  isAvailable(): boolean {
    return this.gateway.isConnected();
  }

  async getStreamInfo(): Promise<TwitchStreamInfo | null> {
    if (!this.isAvailable()) {
      throw new Error("Streamer.bot not connected");
    }

    try {
      // Streamer.bot provides broadcaster info through its API
      // Note: This requires Streamer.bot to have Twitch integration configured
      // The client exposes getBroadcaster() and getActiveViewers() methods
      const client = (this.gateway as any).client;

      if (!client) {
        throw new Error("Streamer.bot client not initialized");
      }

      // Try to get broadcaster info
      // The @streamerbot/client library provides these methods
      let broadcasterInfo: any = null;
      let viewerCount = 0;

      try {
        // getBroadcaster returns info about the connected broadcaster
        if (typeof client.getBroadcaster === "function") {
          broadcasterInfo = await client.getBroadcaster();
        }
      } catch (e) {
        this.logger.debug("getBroadcaster not available or failed", e);
      }

      try {
        // getActiveViewers returns viewer list
        if (typeof client.getActiveViewers === "function") {
          const viewers = await client.getActiveViewers();
          viewerCount = Array.isArray(viewers) ? viewers.length : 0;
        }
      } catch (e) {
        this.logger.debug("getActiveViewers not available or failed", e);
      }

      // If we couldn't get broadcaster info, return a minimal response
      if (!broadcasterInfo) {
        this.logger.warn("Could not get broadcaster info from Streamer.bot");
        return null;
      }

      return {
        isLive: broadcasterInfo.isLive ?? false,
        viewerCount: broadcasterInfo.viewerCount ?? viewerCount,
        title: broadcasterInfo.title ?? "",
        category: broadcasterInfo.gameName ?? broadcasterInfo.category ?? "",
        categoryId: broadcasterInfo.gameId ?? broadcasterInfo.categoryId ?? "",
        uptimeSeconds: broadcasterInfo.uptime ?? null,
        broadcasterName: broadcasterInfo.userName ?? broadcasterInfo.displayName,
      };
    } catch (error) {
      this.logger.error("Failed to get stream info from Streamer.bot", error);
      throw error;
    }
  }

  async updateStreamInfo(params: TwitchUpdateParams): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error("Streamer.bot not connected");
    }

    try {
      const client = (this.gateway as any).client;

      if (!client) {
        throw new Error("Streamer.bot client not initialized");
      }

      // Streamer.bot can execute actions that update stream info
      // This typically requires a pre-configured action in Streamer.bot
      // that uses the "Set Channel Title" or "Set Channel Game" sub-actions

      if (params.title && typeof client.doAction === "function") {
        // Execute a Streamer.bot action to set title
        // The action ID would need to be configured in settings
        this.logger.info("Updating stream title via Streamer.bot", { title: params.title });
        // Note: This would require a specific action setup in Streamer.bot
        // For now, we'll throw to indicate this needs to be implemented
        throw new Error("Stream title update via Streamer.bot requires action configuration");
      }

      if (params.categoryId && typeof client.doAction === "function") {
        this.logger.info("Updating stream category via Streamer.bot", { categoryId: params.categoryId });
        throw new Error("Stream category update via Streamer.bot requires action configuration");
      }
    } catch (error) {
      this.logger.error("Failed to update stream info via Streamer.bot", error);
      throw error;
    }
  }
}

// ============================================================================
// TWITCH API PROVIDER (Placeholder - requires OAuth implementation)
// ============================================================================

/**
 * Twitch provider using direct Twitch Helix API
 * Note: This is a placeholder - full OAuth implementation would be needed
 */
class TwitchAPIProvider implements ITwitchProvider {
  readonly providerId: TwitchProviderType = "twitch-api";
  private logger: Logger;
  private accessToken: string | null = null;
  private clientId: string | null = null;
  private broadcasterId: string | null = null;

  constructor() {
    this.logger = new Logger("TwitchAPIProvider");
    // Load from environment or settings
    this.clientId = process.env.TWITCH_CLIENT_ID || null;
  }

  isAvailable(): boolean {
    // Available if we have valid OAuth token and client ID
    return !!(this.accessToken && this.clientId);
  }

  setCredentials(accessToken: string, clientId: string, broadcasterId?: string): void {
    this.accessToken = accessToken;
    this.clientId = clientId;
    this.broadcasterId = broadcasterId || null;
  }

  async getStreamInfo(): Promise<TwitchStreamInfo | null> {
    if (!this.isAvailable()) {
      throw new Error("Twitch API credentials not configured");
    }

    try {
      // First, get broadcaster ID if we don't have it
      if (!this.broadcasterId) {
        await this.fetchBroadcasterId();
      }

      // Fetch stream info from Helix API
      const streamResponse = await fetch(
        `https://api.twitch.tv/helix/streams?user_id=${this.broadcasterId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Client-Id": this.clientId!,
          },
        }
      );

      if (!streamResponse.ok) {
        throw new Error(`Twitch API error: ${streamResponse.statusText}`);
      }

      const streamData = await streamResponse.json();
      const stream = streamData.data?.[0];

      if (!stream) {
        // Stream is offline, fetch channel info for title/category
        return this.getOfflineChannelInfo();
      }

      // Calculate uptime
      const startedAt = new Date(stream.started_at);
      const uptimeSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

      return {
        isLive: true,
        viewerCount: stream.viewer_count || 0,
        title: stream.title || "",
        category: stream.game_name || "",
        categoryId: stream.game_id || "",
        uptimeSeconds,
        broadcasterName: stream.user_name,
      };
    } catch (error) {
      this.logger.error("Failed to get stream info from Twitch API", error);
      throw error;
    }
  }

  private async fetchBroadcasterId(): Promise<void> {
    const response = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Client-Id": this.clientId!,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Twitch user ID");
    }

    const data = await response.json();
    this.broadcasterId = data.data?.[0]?.id;

    if (!this.broadcasterId) {
      throw new Error("Could not determine broadcaster ID");
    }
  }

  private async getOfflineChannelInfo(): Promise<TwitchStreamInfo> {
    const response = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${this.broadcasterId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Client-Id": this.clientId!,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch channel info");
    }

    const data = await response.json();
    const channel = data.data?.[0];

    return {
      isLive: false,
      viewerCount: 0,
      title: channel?.title || "",
      category: channel?.game_name || "",
      categoryId: channel?.game_id || "",
      uptimeSeconds: null,
      broadcasterName: channel?.broadcaster_name,
    };
  }

  async updateStreamInfo(params: TwitchUpdateParams): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error("Twitch API credentials not configured");
    }

    if (!this.broadcasterId) {
      await this.fetchBroadcasterId();
    }

    const body: Record<string, string> = {};
    if (params.title) body.title = params.title;
    if (params.categoryId) body.game_id = params.categoryId;

    const response = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${this.broadcasterId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Client-Id": this.clientId!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update stream info: ${errorText}`);
    }

    this.logger.info("Stream info updated via Twitch API", params);
  }

  async searchCategories(query: string): Promise<TwitchCategory[]> {
    if (!this.isAvailable()) {
      throw new Error("Twitch API credentials not configured");
    }

    const response = await fetch(
      `https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Client-Id": this.clientId!,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to search categories");
    }

    const data = await response.json();
    return (data.data || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      boxArtUrl: cat.box_art_url,
    }));
  }
}

// ============================================================================
// TWITCH SERVICE
// ============================================================================

/**
 * Main TwitchService - manages providers, polling, and broadcasts
 */
export class TwitchService {
  private static instance: TwitchService;

  private logger: Logger;
  private wsHub: WebSocketHub;
  private providers: ITwitchProvider[] = [];
  private activeProvider: ITwitchProvider | null = null;

  private pollInterval: NodeJS.Timeout | null = null;
  private pollIntervalMs: number;
  private lastStreamInfo: TwitchStreamInfo | null = null;
  private lastPollTime: number | null = null;
  private isPolling = false;

  private constructor() {
    this.logger = new Logger("TwitchService");
    this.wsHub = WebSocketHub.getInstance();
    this.pollIntervalMs = DEFAULT_TWITCH_SETTINGS.pollIntervalMs;

    // Initialize providers
    this.providers = [
      new StreamerbotTwitchProvider(),
      new TwitchAPIProvider(),
    ];

    // Load saved credentials from settings
    this.loadTwitchAPICredentials();

    this.logger.info("TwitchService initialized with providers:", {
      providers: this.providers.map((p) => p.providerId),
    });
  }

  /**
   * Load Twitch API credentials from settings
   */
  private loadTwitchAPICredentials(): void {
    try {
      const settingsService = SettingsService.getInstance();
      const settings = settingsService.getTwitchSettings();

      if (settings.oauth && settings.clientId) {
        this.setTwitchAPICredentials(settings.oauth.accessToken, settings.clientId);
        this.logger.info("Loaded Twitch API credentials from settings");
      }
    } catch (error) {
      this.logger.warn("Failed to load Twitch API credentials:", error);
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TwitchService {
    if (!TwitchService.instance) {
      TwitchService.instance = new TwitchService();
    }
    return TwitchService.instance;
  }

  /**
   * Start automatic polling for stream info
   */
  startPolling(): void {
    if (this.pollInterval) {
      this.logger.warn("Polling already active");
      return;
    }

    this.selectProvider();

    if (!this.activeProvider) {
      this.logger.warn("No Twitch provider available, polling disabled");
      this.isPolling = false;
      return;
    }

    this.logger.info("Starting Twitch polling", {
      provider: this.activeProvider.providerId,
      intervalMs: this.pollIntervalMs,
    });

    this.isPolling = true;

    // Initial poll with error handling
    this.poll().catch((error) => {
      this.logger.error("Initial Twitch poll failed:", error);
    });

    // Start interval
    this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isPolling = false;
      this.logger.info("Stopped Twitch polling");
    }
  }

  /**
   * Set polling interval
   */
  setPollInterval(intervalMs: number): void {
    const clamped = Math.max(
      TWITCH.MIN_POLL_INTERVAL_MS,
      Math.min(TWITCH.MAX_POLL_INTERVAL_MS, intervalMs)
    );
    this.pollIntervalMs = clamped;

    // Restart polling if active
    if (this.pollInterval) {
      this.stopPolling();
      this.startPolling();
    }
  }

  /**
   * Select the best available provider
   */
  private selectProvider(): void {
    const previousProvider = this.activeProvider?.providerId;

    for (const provider of this.providers) {
      if (provider.isAvailable()) {
        this.activeProvider = provider;

        if (previousProvider !== provider.providerId) {
          this.logger.info("Selected Twitch provider:", provider.providerId);
          this.broadcastProviderStatus();
        }
        return;
      }
    }

    this.activeProvider = null;

    if (previousProvider !== null) {
      this.logger.warn("No available Twitch provider");
      this.broadcastProviderStatus();
    }
  }

  /**
   * Execute a single poll cycle
   */
  private async poll(): Promise<void> {
    // Re-check provider availability
    if (!this.activeProvider?.isAvailable()) {
      this.selectProvider();
      if (!this.activeProvider) return;
    }

    try {
      const streamInfo = await this.activeProvider.getStreamInfo();
      this.lastPollTime = Date.now();

      // Check for changes and broadcast
      if (this.hasStreamInfoChanged(streamInfo)) {
        this.lastStreamInfo = streamInfo;
        this.broadcastStreamInfo(streamInfo);
        this.logger.debug("Stream info updated", streamInfo);
      }
    } catch (error) {
      this.logger.error("Twitch poll failed:", error);

      // Try fallback provider
      const currentProvider = this.activeProvider.providerId;
      this.selectProvider();

      if (this.activeProvider && this.activeProvider.providerId !== currentProvider) {
        this.logger.info("Switched to fallback provider:", this.activeProvider.providerId);
        // Retry poll with new provider
        try {
          const streamInfo = await this.activeProvider.getStreamInfo();
          this.lastPollTime = Date.now();
          this.lastStreamInfo = streamInfo;
          this.broadcastStreamInfo(streamInfo);
        } catch (retryError) {
          this.logger.error("Fallback provider also failed:", retryError);
        }
      }

      // Broadcast error
      this.wsHub.broadcast(TWITCH_WS_CHANNEL, {
        type: "poll-error",
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          provider: currentProvider,
        },
      });
    }
  }

  /**
   * Check if stream info has changed
   */
  private hasStreamInfoChanged(newInfo: TwitchStreamInfo | null): boolean {
    if (!this.lastStreamInfo && !newInfo) return false;
    if (!this.lastStreamInfo || !newInfo) return true;

    return (
      this.lastStreamInfo.isLive !== newInfo.isLive ||
      this.lastStreamInfo.viewerCount !== newInfo.viewerCount ||
      this.lastStreamInfo.title !== newInfo.title ||
      this.lastStreamInfo.category !== newInfo.category
    );
  }

  /**
   * Broadcast stream info to WebSocket clients
   */
  private broadcastStreamInfo(streamInfo: TwitchStreamInfo | null): void {
    if (!streamInfo) return;

    this.wsHub.broadcast(TWITCH_WS_CHANNEL, {
      type: "stream-info",
      data: streamInfo,
    });
  }

  /**
   * Broadcast provider status to WebSocket clients
   */
  private broadcastProviderStatus(): void {
    this.wsHub.broadcast(TWITCH_WS_CHANNEL, {
      type: "provider-changed",
      data: this.getProviderStatus(),
    });
  }

  /**
   * Get current stream info (returns cached if recent)
   */
  async getStreamInfo(): Promise<TwitchStreamInfo | null> {
    // Return cached data if recent
    if (this.lastStreamInfo && this.lastPollTime) {
      const age = Date.now() - this.lastPollTime;
      if (age < this.pollIntervalMs) {
        return this.lastStreamInfo;
      }
    }

    // Force fresh poll
    if (!this.activeProvider?.isAvailable()) {
      this.selectProvider();
    }

    if (!this.activeProvider) {
      return null;
    }

    const streamInfo = await this.activeProvider.getStreamInfo();
    this.lastStreamInfo = streamInfo;
    this.lastPollTime = Date.now();
    return streamInfo;
  }

  /**
   * Update stream title and/or category
   */
  async updateStreamInfo(params: TwitchUpdateParams): Promise<void> {
    if (!this.activeProvider?.isAvailable()) {
      this.selectProvider();
    }

    if (!this.activeProvider) {
      throw new Error("No Twitch provider available");
    }

    await this.activeProvider.updateStreamInfo(params);

    // Reset interval to prevent concurrent poll
    const wasPolling = this.isPolling;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Invalidate cache and trigger immediate poll
    this.lastPollTime = null;
    await this.poll();

    // Restart interval if was active
    if (wasPolling) {
      this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
    }
  }

  /**
   * Search for categories/games
   */
  async searchCategories(query: string): Promise<TwitchCategory[]> {
    // Prefer Twitch API provider for search
    const apiProvider = this.providers.find(
      (p) => p.providerId === "twitch-api" && p.isAvailable()
    ) as TwitchAPIProvider | undefined;

    if (apiProvider?.searchCategories) {
      return apiProvider.searchCategories(query);
    }

    throw new Error("Category search requires Twitch API provider");
  }

  /**
   * Get current provider status
   */
  getProviderStatus(): TwitchProviderStatus {
    return {
      activeProvider: this.activeProvider?.providerId || "none",
      streamerbotAvailable: this.providers[0]?.isAvailable() || false,
      twitchApiAvailable: this.providers[1]?.isAvailable() || false,
      lastPollTime: this.lastPollTime,
      pollIntervalMs: this.pollIntervalMs,
      isPolling: this.isPolling,
    };
  }

  /**
   * Get cached stream info without fetching
   */
  getCachedStreamInfo(): TwitchStreamInfo | null {
    return this.lastStreamInfo;
  }

  /**
   * Set Twitch API credentials (for direct API provider)
   */
  setTwitchAPICredentials(accessToken: string, clientId: string, broadcasterId?: string): void {
    const apiProvider = this.providers.find(
      (p) => p.providerId === "twitch-api"
    ) as TwitchAPIProvider | undefined;

    if (apiProvider) {
      apiProvider.setCredentials(accessToken, clientId, broadcasterId);
      this.logger.info("Twitch API credentials set");
      // Re-select provider in case API is now preferred
      this.selectProvider();
    }
  }

  /**
   * Force provider selection refresh
   */
  refreshProviders(): void {
    this.selectProvider();
  }
}
