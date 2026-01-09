/**
 * TwitchAPIClient
 *
 * Low-level HTTP client for Twitch Helix API requests.
 * Handles automatic token refresh on 401 responses and provides
 * typed request/response methods.
 */

import { Logger } from "../../utils/Logger";
import { TwitchOAuthManager } from "./TwitchOAuthManager";
import { TWITCH } from "../../config/Constants";

// ============================================================================
// TYPES
// ============================================================================

export interface TwitchAPIError {
  status: number;
  message: string;
  error?: string;
}

export interface TwitchAPIResponse<T> {
  data: T[];
  pagination?: {
    cursor?: string;
  };
}

// ============================================================================
// TWITCH API CLIENT
// ============================================================================


export class TwitchAPIClient {
  private logger: Logger;
  private oauthManager: TwitchOAuthManager;

  constructor(oauthManager: TwitchOAuthManager) {
    this.logger = new Logger("TwitchAPIClient");
    this.oauthManager = oauthManager;
  }

  // ==========================================================================
  // HTTP METHODS
  // ==========================================================================

  /**
   * Make a GET request to Twitch API
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    return this.request<T>("GET", url);
  }

  /**
   * Make a POST request to Twitch API
   */
  async post<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.request<T>("POST", url, body);
  }

  /**
   * Make a PATCH request to Twitch API
   */
  async patch<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.request<T>("PATCH", url, body);
  }

  /**
   * Make a DELETE request to Twitch API
   */
  async delete<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    return this.request<T>("DELETE", url);
  }

  // ==========================================================================
  // REQUEST HANDLING
  // ==========================================================================

  /**
   * Make an authenticated request to Twitch API
   */
  private async request<T>(
    method: string,
    url: string,
    body?: Record<string, unknown>,
    isRetry = false
  ): Promise<T> {
    // Get valid access token
    const accessToken = await this.oauthManager.getValidAccessToken();
    if (!accessToken) {
      throw new Error("Not authenticated with Twitch");
    }

    // Get client ID
    const credentials = this.oauthManager.getCredentials();
    if (!credentials) {
      throw new Error("Twitch credentials not configured");
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": credentials.clientId,
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TWITCH.API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle 401 Unauthorized - try to refresh token and retry once
      if (response.status === 401 && !isRetry) {
        this.logger.info("Received 401, attempting token refresh and retry");
        await this.oauthManager.refreshToken();
        return this.request<T>(method, url, body, true);
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        this.logger.warn(`Rate limited, retry after ${retryAfter}s`);
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
      }

      // Handle other errors
      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage: string;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorJson.error || errorBody;
        } catch {
          errorMessage = errorBody;
        }
        throw new Error(`Twitch API error: ${response.status} ${errorMessage}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Twitch API request timed out");
      }

      throw error;
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint.startsWith("/") ? endpoint.slice(1) : endpoint, TWITCH.API_BASE + "/");

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }

    return url.toString();
  }

  // ==========================================================================
  // CONVENIENCE METHODS
  // ==========================================================================

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<TwitchUser | null> {
    try {
      const response = await this.get<TwitchAPIResponse<TwitchUser>>("users");
      return response.data?.[0] || null;
    } catch (error) {
      this.logger.error("Failed to get current user", error);
      return null;
    }
  }

  /**
   * Get stream info for a user
   */
  async getStreamInfo(userId: string): Promise<TwitchStream | null> {
    try {
      const response = await this.get<TwitchAPIResponse<TwitchStream>>("streams", {
        user_id: userId,
      });
      return response.data?.[0] || null;
    } catch (error) {
      this.logger.error("Failed to get stream info", error);
      return null;
    }
  }

  /**
   * Get channel info for a broadcaster
   */
  async getChannelInfo(broadcasterId: string): Promise<TwitchChannel | null> {
    try {
      const response = await this.get<TwitchAPIResponse<TwitchChannel>>("channels", {
        broadcaster_id: broadcasterId,
      });
      return response.data?.[0] || null;
    } catch (error) {
      this.logger.error("Failed to get channel info", error);
      return null;
    }
  }

  /**
   * Update channel info (title, category)
   */
  async updateChannelInfo(
    broadcasterId: string,
    updates: { title?: string; game_id?: string }
  ): Promise<void> {
    await this.patch(`channels?broadcaster_id=${broadcasterId}`, updates);
  }

  /**
   * Search for categories/games
   */
  async searchCategories(query: string): Promise<TwitchCategory[]> {
    try {
      const response = await this.get<TwitchAPIResponse<TwitchCategory>>("search/categories", {
        query,
      });
      return response.data || [];
    } catch (error) {
      this.logger.error("Failed to search categories", error);
      return [];
    }
  }

  /**
   * Send a chat message
   */
  async sendChatMessage(
    broadcasterId: string,
    senderId: string,
    message: string
  ): Promise<TwitchChatMessageResponse | null> {
    try {
      const response = await this.post<TwitchChatMessageResponse>("chat/messages", {
        broadcaster_id: broadcasterId,
        sender_id: senderId,
        message,
      });
      return response;
    } catch (error) {
      this.logger.error("Failed to send chat message", error);
      return null;
    }
  }

  /**
   * Check if client is authenticated and ready
   */
  isReady(): boolean {
    return this.oauthManager.isAuthenticated();
  }
}

// ============================================================================
// TWITCH API TYPES
// ============================================================================

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  email?: string;
  created_at: string;
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: "live" | "";
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  tags: string[];
  is_mature: boolean;
}

export interface TwitchChannel {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  broadcaster_language: string;
  game_id: string;
  game_name: string;
  title: string;
  delay: number;
  tags: string[];
  content_classification_labels: string[];
  is_branded_content: boolean;
}

export interface TwitchCategory {
  id: string;
  name: string;
  box_art_url: string;
}

export interface TwitchChatMessageResponse {
  data: Array<{
    message_id: string;
    is_sent: boolean;
    drop_reason?: {
      code: string;
      message: string;
    };
  }>;
}
