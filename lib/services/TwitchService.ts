/**
 * TwitchService
 *
 * Manages Twitch stream information using direct Twitch API with OAuth.
 *
 * Features:
 * - Automatic polling every 30 seconds
 * - OAuth token management via TwitchOAuthManager
 * - WebSocket broadcast of stream updates
 * - Stream title and category updates
 * - Chat message sending
 */

import { Logger } from "../utils/Logger";
import { WebSocketHub } from "./WebSocketHub";
import { TWITCH } from "../config/Constants";
import { TwitchOAuthManager, TwitchAPIClient } from "./twitch";
import {
  TwitchStreamInfo,
  TwitchUpdateParams,
  TwitchProviderStatus,
  TwitchCategory,
  TWITCH_WS_CHANNEL,
  DEFAULT_TWITCH_SETTINGS,
} from "../models/Twitch";

// ============================================================================
// TWITCH SERVICE
// ============================================================================

/**
 * Main TwitchService - manages polling, API requests, and broadcasts
 */
export class TwitchService {
  private static instance: TwitchService;

  private logger: Logger;
  private wsHub: WebSocketHub;
  private oauthManager: TwitchOAuthManager;
  private apiClient: TwitchAPIClient;

  private pollInterval: NodeJS.Timeout | null = null;
  private pollIntervalMs: number;
  private lastStreamInfo: TwitchStreamInfo | null = null;
  private lastPollTime: number | null = null;
  private isPolling = false;
  private broadcasterId: string | null = null;

  private constructor() {
    this.logger = new Logger("TwitchService");
    this.wsHub = WebSocketHub.getInstance();
    this.pollIntervalMs = DEFAULT_TWITCH_SETTINGS.pollIntervalMs;

    // Initialize OAuth manager and API client
    this.oauthManager = TwitchOAuthManager.getInstance();
    this.apiClient = new TwitchAPIClient(this.oauthManager);

    this.logger.info("TwitchService initialized with direct Twitch API");
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

  // ==========================================================================
  // POLLING
  // ==========================================================================

  /**
   * Start automatic polling for stream info
   */
  startPolling(): void {
    if (this.pollInterval) {
      this.logger.warn("Polling already active");
      return;
    }

    if (!this.isAvailable()) {
      this.logger.warn("Twitch API not available, polling disabled");
      this.isPolling = false;
      return;
    }

    this.logger.info("Starting Twitch polling", {
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
   * Check if Twitch API is available
   */
  isAvailable(): boolean {
    return this.oauthManager.isAuthenticated();
  }

  /**
   * Execute a single poll cycle
   */
  private async poll(): Promise<void> {
    // Check if API is available
    if (!this.isAvailable()) {
      this.logger.debug("Twitch API not available, skipping poll");
      return;
    }

    try {
      // Get broadcaster ID if we don't have it
      if (!this.broadcasterId) {
        await this.fetchBroadcasterId();
      }

      if (!this.broadcasterId) {
        this.logger.warn("Could not determine broadcaster ID");
        return;
      }

      const streamInfo = await this.fetchStreamInfo();
      this.lastPollTime = Date.now();

      // Check for changes and broadcast
      if (this.hasStreamInfoChanged(streamInfo)) {
        this.lastStreamInfo = streamInfo;
        this.broadcastStreamInfo(streamInfo);
        this.logger.debug("Stream info updated", streamInfo);
      }
    } catch (error) {
      this.logger.error("Twitch poll failed:", error);

      // Broadcast error
      this.wsHub.broadcast(TWITCH_WS_CHANNEL, {
        type: "poll-error",
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          provider: "twitch-api",
        },
      });
    }
  }

  /**
   * Fetch broadcaster ID from Twitch API
   */
  private async fetchBroadcasterId(): Promise<void> {
    const user = await this.apiClient.getCurrentUser();
    if (user) {
      this.broadcasterId = user.id;
      this.logger.info("Broadcaster ID fetched:", { id: user.id, login: user.login });
    }
  }

  /**
   * Fetch stream info from Twitch API
   */
  private async fetchStreamInfo(): Promise<TwitchStreamInfo | null> {
    if (!this.broadcasterId) {
      return null;
    }

    // Try to get live stream info first
    const stream = await this.apiClient.getStreamInfo(this.broadcasterId);

    if (stream) {
      // Stream is live
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
    }

    // Stream is offline, get channel info for title/category
    const channel = await this.apiClient.getChannelInfo(this.broadcasterId);

    if (channel) {
      return {
        isLive: false,
        viewerCount: 0,
        title: channel.title || "",
        category: channel.game_name || "",
        categoryId: channel.game_id || "",
        uptimeSeconds: null,
        broadcasterName: channel.broadcaster_name,
      };
    }

    return null;
  }

  // ==========================================================================
  // STREAM INFO
  // ==========================================================================

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
    if (!this.isAvailable()) {
      return null;
    }

    // Get broadcaster ID if we don't have it
    if (!this.broadcasterId) {
      await this.fetchBroadcasterId();
    }

    const streamInfo = await this.fetchStreamInfo();
    this.lastStreamInfo = streamInfo;
    this.lastPollTime = Date.now();
    return streamInfo;
  }

  /**
   * Update stream title and/or category
   */
  async updateStreamInfo(params: TwitchUpdateParams): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error("Twitch API not available");
    }

    if (!this.broadcasterId) {
      await this.fetchBroadcasterId();
    }

    if (!this.broadcasterId) {
      throw new Error("Could not determine broadcaster ID");
    }

    const updates: { title?: string; game_id?: string } = {};
    if (params.title) updates.title = params.title;
    if (params.categoryId) updates.game_id = params.categoryId;

    await this.apiClient.updateChannelInfo(this.broadcasterId, updates);

    this.logger.info("Stream info updated", params);

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
    if (!this.isAvailable()) {
      throw new Error("Twitch API not available");
    }

    const categories = await this.apiClient.searchCategories(query);
    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      boxArtUrl: cat.box_art_url,
    }));
  }

  // ==========================================================================
  // CHAT
  // ==========================================================================

  /**
   * Send a chat message
   */
  async sendChatMessage(message: string): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error("Twitch API not available");
    }

    if (!this.broadcasterId) {
      await this.fetchBroadcasterId();
    }

    if (!this.broadcasterId) {
      throw new Error("Could not determine broadcaster ID");
    }

    const result = await this.apiClient.sendChatMessage(
      this.broadcasterId,
      this.broadcasterId, // Sender is the broadcaster
      message
    );

    return result?.data?.[0]?.is_sent ?? false;
  }

  // ==========================================================================
  // STATUS
  // ==========================================================================

  /**
   * Get current provider status
   */
  getProviderStatus(): TwitchProviderStatus {
    const authStatus = this.oauthManager.getStatus();

    return {
      activeProvider: this.isAvailable() ? "twitch-api" : "none",
      streamerbotAvailable: false, // Removed
      twitchApiAvailable: this.isAvailable(),
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
   * Get OAuth authentication status
   */
  getAuthStatus() {
    return this.oauthManager.getStatus();
  }

  /**
   * Force provider selection refresh (triggers status broadcast)
   */
  refreshProviders(): void {
    this.broadcastProviderStatus();

    // Also clear broadcaster ID to force re-fetch
    this.broadcasterId = null;
  }

  /**
   * Get the TwitchAPIClient for direct API access
   */
  getAPIClient(): TwitchAPIClient {
    return this.apiClient;
  }

  /**
   * Get the TwitchOAuthManager for auth status
   */
  getOAuthManager(): TwitchOAuthManager {
    return this.oauthManager;
  }
}
