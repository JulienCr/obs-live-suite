/**
 * TwitchOAuthManager
 *
 * Manages Twitch OAuth 2.0 authorization flow with PKCE and token lifecycle.
 * Implements a state machine for authentication states and handles automatic
 * token refresh before expiry.
 *
 * States: disconnected → authorizing → authorized ↔ refreshing → error
 */

import { Logger } from "../../utils/Logger";
import { DatabaseService } from "../DatabaseService";
import { SettingsService } from "../SettingsService";
import { WebSocketHub } from "../WebSocketHub";
import { generateCodeVerifier, generateCodeChallenge, generateState } from "../../utils/pkce";
import { TWITCH } from "../../config/Constants";
import {
  TwitchAuthState,
  TwitchAuthStatus,
  TwitchAuthError,
  TwitchAuthErrorType,
  TwitchOAuthState,
  TwitchTokenResponseSchema,
  TwitchValidateResponseSchema,
  TwitchUserInfoSchema,
  TwitchCredentials,
  TWITCH_OAUTH_SCOPES,
  TWITCH_OAUTH_ENDPOINTS,
  TWITCH_OAUTH_CALLBACK_PATH,
  TWITCH_AUTH_WS_CHANNEL,
  DEFAULT_AUTH_STATUS,
  isValidAuthTransition,
  createAuthError,
} from "../../models/TwitchAuth";
import type { TwitchTokenResponse, TwitchValidateResponse, TwitchUserInfo } from "../../models/TwitchAuth";
import type { TwitchOAuthTokens } from "../../models/Twitch";

// ============================================================================
// CONSTANTS
// ============================================================================

/** How often to check token expiry (60 seconds) */
const REFRESH_CHECK_INTERVAL_MS = 60 * 1000;

/** OAuth state expiry (5 minutes) */
const OAUTH_STATE_EXPIRY_MS = 5 * 60 * 1000;

// ============================================================================
// TWITCH OAUTH MANAGER
// ============================================================================

export class TwitchOAuthManager {
  private static instance: TwitchOAuthManager;

  private logger: Logger;
  private settingsService: SettingsService;
  private wsHub: WebSocketHub;

  private status: TwitchAuthStatus;
  // OAuth state is now stored in database via SettingsService
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshInProgress = false;
  private initializationPromise: Promise<void> | null = null;
  private initialized = false;

  private constructor() {
    this.logger = new Logger("TwitchOAuthManager");
    this.settingsService = SettingsService.getInstance();
    this.wsHub = WebSocketHub.getInstance();
    this.status = { ...DEFAULT_AUTH_STATUS };

    // Start initialization (don't await in constructor)
    this.initializationPromise = this.initializeFromStoredTokens();
  }

  /**
   * Ensure initialization from stored tokens is complete.
   * Call this before relying on isAuthenticated() at startup.
   */
  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    this.initialized = true;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TwitchOAuthManager {
    if (!TwitchOAuthManager.instance) {
      TwitchOAuthManager.instance = new TwitchOAuthManager();
    }
    return TwitchOAuthManager.instance;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize from stored tokens if available
   */
  private async initializeFromStoredTokens(): Promise<void> {
    try {
      const tokens = this.settingsService.getTwitchOAuthTokens();
      const settings = this.settingsService.getTwitchSettings();

      this.logger.debug("initializeFromStoredTokens", {
        hasTokens: !!tokens,
        hasClientId: !!settings.clientId,
        hasCachedUser: !!tokens?.user,
      });

      if (!tokens || !settings.clientId) {
        this.logger.info("No stored Twitch tokens found");
        return;
      }

      // Check if tokens are expired
      const now = Date.now();
      if (tokens.expiresAt <= now) {
        this.logger.info("Stored Twitch tokens are expired, attempting refresh");
        await this.refreshToken();
        return;
      }

      // Use cached user if available
      let userInfo = tokens.user;

      // If no cached user, validate token and fetch from API
      if (!userInfo) {
        this.logger.debug("No cached user, fetching from Twitch API");
        const validation = await this.validateToken(tokens.accessToken);
        if (!validation) {
          this.logger.warn("Stored token validation failed, attempting refresh");
          await this.refreshToken();
          return;
        }

        const fetchedUser = await this.fetchUserInfo(tokens.accessToken, settings.clientId);
        if (fetchedUser) {
          userInfo = {
            id: fetchedUser.id,
            login: fetchedUser.login,
            displayName: fetchedUser.display_name,
            email: fetchedUser.email,
            profileImageUrl: fetchedUser.profile_image_url,
          };
          // Cache the user info for future reloads
          this.settingsService.saveTwitchOAuthTokens({
            ...tokens,
            user: userInfo,
          });
        }
      } else {
        this.logger.debug("Using cached user info", { login: userInfo.login });
      }

      // Update status to authorized
      this.updateStatus({
        state: "authorized",
        user: userInfo || null,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scope || null,
        error: null,
        lastAuthTime: now,
      });

      // Start refresh timer
      this.startRefreshTimer();

      this.logger.info("Initialized from stored tokens", {
        user: userInfo?.login,
        expiresIn: Math.round((tokens.expiresAt - now) / 1000 / 60) + " minutes",
      });
    } catch (error) {
      this.logger.error("Failed to initialize from stored tokens", error);
      // Set error state instead of silently failing
      this.updateStatus({
        state: "error",
        error: {
          type: "api_error",
          message: error instanceof Error ? error.message : "Failed to initialize from stored tokens",
          timestamp: Date.now(),
          recoverable: true,
        },
      });
    }
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Get current auth status
   */
  getStatus(): TwitchAuthStatus {
    return { ...this.status };
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.status.state === "authorized" && this.status.user !== null;
  }

  /**
   * Update auth status with validation
   */
  private updateStatus(newStatus: Partial<TwitchAuthStatus>): void {
    const previousState = this.status.state;
    const newState = newStatus.state || previousState;

    // Validate state transition
    if (newStatus.state && newStatus.state !== previousState) {
      if (!isValidAuthTransition(previousState, newState)) {
        this.logger.error(`Invalid state transition: ${previousState} → ${newState}`);
        return;
      }
    }

    this.status = { ...this.status, ...newStatus };

    // Broadcast status change
    this.broadcastStatus();

    if (newStatus.state && newStatus.state !== previousState) {
      this.logger.info(`Auth state: ${previousState} → ${newState}`);
    }
  }

  /**
   * Broadcast auth status via WebSocket
   */
  private broadcastStatus(): void {
    this.wsHub.broadcast(TWITCH_AUTH_WS_CHANNEL, {
      type: "auth-status",
      data: this.status,
    });
  }

  /**
   * Broadcast auth error via WebSocket
   */
  private broadcastError(error: TwitchAuthError): void {
    this.wsHub.broadcast(TWITCH_AUTH_WS_CHANNEL, {
      type: "auth-error",
      data: error,
    });
  }

  // ==========================================================================
  // OAUTH FLOW
  // ==========================================================================

  /**
   * Start OAuth authorization flow
   * @param returnUrl - URL to redirect to after successful auth
   * @returns Authorization URL to redirect user to
   */
  startAuthFlow(returnUrl?: string): { authUrl: string; state: string } {
    const settings = this.settingsService.getTwitchSettings();

    if (!settings.clientId) {
      throw new Error("Twitch Client ID not configured");
    }

    // Generate PKCE values
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store pending OAuth state in database (survives server restarts)
    this.settingsService.saveTwitchOAuthState({
      state,
      codeVerifier,
      createdAt: Date.now(),
      returnUrl,
    });

    // Build redirect URI
    // Note: In production, this should be the actual server URL
    const redirectUri = this.getRedirectUri();

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: settings.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: TWITCH_OAUTH_SCOPES.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${TWITCH_OAUTH_ENDPOINTS.AUTHORIZE}?${params.toString()}`;

    // Update state to authorizing
    this.updateStatus({ state: "authorizing", error: null });

    this.logger.info("Started OAuth flow", { state, returnUrl });

    return { authUrl, state };
  }

  /**
   * Handle OAuth callback
   * @param code - Authorization code from Twitch
   * @param state - State parameter for CSRF verification
   */
  async handleCallback(code: string, state: string): Promise<void> {
    // Get pending OAuth state from database
    const pendingState = this.settingsService.getTwitchOAuthState();

    // Verify state parameter
    if (!pendingState) {
      throw this.createAndSetError("invalid_state", "No pending OAuth flow");
    }

    if (pendingState.state !== state) {
      this.settingsService.saveTwitchOAuthState(null);
      throw this.createAndSetError("invalid_state", "State parameter mismatch");
    }

    // Check if state expired
    if (Date.now() - pendingState.createdAt > OAUTH_STATE_EXPIRY_MS) {
      this.settingsService.saveTwitchOAuthState(null);
      throw this.createAndSetError("invalid_state", "OAuth state expired");
    }

    const { codeVerifier } = pendingState;
    this.settingsService.saveTwitchOAuthState(null);

    const settings = this.settingsService.getTwitchSettings();
    const clientSecret = this.settingsService.getTwitchClientSecret();

    if (!settings.clientId || !clientSecret) {
      throw this.createAndSetError("missing_credentials", "Client credentials not configured");
    }

    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(
        code,
        codeVerifier,
        settings.clientId,
        clientSecret
      );

      // Calculate expiry timestamp
      const expiresAt = Date.now() + tokens.expires_in * 1000;

      // Fetch user info BEFORE saving tokens so we can include it in the save
      const userInfo = await this.fetchUserInfo(tokens.access_token, settings.clientId);

      // Save tokens with user info
      this.settingsService.saveTwitchOAuthTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
        user: userInfo ? {
          id: userInfo.id,
          login: userInfo.login,
          displayName: userInfo.display_name,
          email: userInfo.email,
          profileImageUrl: userInfo.profile_image_url,
        } : undefined,
      });

      // Update status to authorized
      this.updateStatus({
        state: "authorized",
        user: userInfo ? {
          id: userInfo.id,
          login: userInfo.login,
          displayName: userInfo.display_name,
          email: userInfo.email,
          profileImageUrl: userInfo.profile_image_url,
        } : null,
        expiresAt,
        scopes: tokens.scope,
        error: null,
        lastAuthTime: Date.now(),
      });

      // Start refresh timer
      this.startRefreshTimer();

      this.logger.info("OAuth callback successful", {
        user: userInfo?.login,
        scopes: tokens.scope.length,
      });
    } catch (error) {
      this.logger.error("OAuth callback failed", error);
      throw this.createAndSetError(
        "api_error",
        error instanceof Error ? error.message : "Failed to exchange authorization code"
      );
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    clientId: string,
    clientSecret: string
  ): Promise<TwitchTokenResponse> {
    const redirectUri = this.getRedirectUri();

    const response = await fetch(TWITCH_OAUTH_ENDPOINTS.TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return TwitchTokenResponseSchema.parse(data);
  }

  // ==========================================================================
  // TOKEN REFRESH
  // ==========================================================================

  /**
   * Start the background token refresh timer
   */
  private startRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, REFRESH_CHECK_INTERVAL_MS);

    this.logger.debug("Started token refresh timer");
  }

  /**
   * Stop the background token refresh timer
   */
  private stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      this.logger.debug("Stopped token refresh timer");
    }
  }

  /**
   * Check if token needs refresh and refresh if needed
   */
  private async checkAndRefreshToken(): Promise<void> {
    if (this.status.state !== "authorized" || this.refreshInProgress) {
      return;
    }

    const tokens = this.settingsService.getTwitchOAuthTokens();
    if (!tokens) return;

    const timeUntilExpiry = tokens.expiresAt - Date.now();

    if (timeUntilExpiry < TWITCH.TOKEN_REFRESH_BUFFER_MS) {
      this.logger.info("Token expiring soon, refreshing...", {
        expiresIn: Math.round(timeUntilExpiry / 1000) + " seconds",
      });
      await this.refreshToken();
    }
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<void> {
    if (this.refreshInProgress) {
      this.logger.debug("Refresh already in progress, skipping");
      return;
    }

    this.refreshInProgress = true;

    try {
      const tokens = this.settingsService.getTwitchOAuthTokens();
      const settings = this.settingsService.getTwitchSettings();
      const clientSecret = this.settingsService.getTwitchClientSecret();

      if (!tokens?.refreshToken || !settings.clientId || !clientSecret) {
        throw new Error("Missing credentials for token refresh");
      }

      // Update state to refreshing
      if (this.status.state === "authorized") {
        this.updateStatus({ state: "refreshing" });
      }

      const response = await fetch(TWITCH_OAUTH_ENDPOINTS.TOKEN, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: settings.clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const newTokens = TwitchTokenResponseSchema.parse(data);

      // Calculate new expiry
      const expiresAt = Date.now() + newTokens.expires_in * 1000;

      // Get existing tokens to preserve user info
      const existingTokens = this.settingsService.getTwitchOAuthTokens();

      // Save new tokens, preserving cached user info
      this.settingsService.saveTwitchOAuthTokens({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt,
        scope: newTokens.scope,
        user: existingTokens?.user,  // Preserve cached user info
      });

      // Update status
      this.updateStatus({
        state: "authorized",
        expiresAt,
        scopes: newTokens.scope,
      });

      // Broadcast token refreshed event
      this.wsHub.broadcast(TWITCH_AUTH_WS_CHANNEL, {
        type: "token-refreshed",
        data: { expiresAt },
      });

      this.logger.info("Token refreshed successfully", {
        expiresIn: Math.round(newTokens.expires_in / 60) + " minutes",
      });
    } catch (error) {
      this.logger.error("Token refresh failed", error);
      this.createAndSetError(
        "refresh_failed",
        error instanceof Error ? error.message : "Token refresh failed"
      );

      // Clear tokens and disconnect
      this.settingsService.saveTwitchOAuthTokens(null);
      this.stopRefreshTimer();
    } finally {
      this.refreshInProgress = false;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string | null> {
    const tokens = this.settingsService.getTwitchOAuthTokens();
    if (!tokens) return null;

    // Check if token is expired or about to expire
    const timeUntilExpiry = tokens.expiresAt - Date.now();
    if (timeUntilExpiry < TWITCH.TOKEN_REFRESH_BUFFER_MS) {
      await this.refreshToken();
      // Re-fetch tokens after refresh
      const newTokens = this.settingsService.getTwitchOAuthTokens();
      return newTokens?.accessToken || null;
    }

    return tokens.accessToken;
  }

  // ==========================================================================
  // TOKEN VALIDATION
  // ==========================================================================

  /**
   * Validate an access token with Twitch
   */
  private async validateToken(accessToken: string): Promise<TwitchValidateResponse | null> {
    try {
      const response = await fetch(TWITCH_OAUTH_ENDPOINTS.VALIDATE, {
        headers: {
          Authorization: `OAuth ${accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return TwitchValidateResponseSchema.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Fetch user info from Twitch API
   */
  private async fetchUserInfo(accessToken: string, clientId: string): Promise<TwitchUserInfo | null> {
    try {
      const response = await fetch("https://api.twitch.tv/helix/users", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": clientId,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!data.data || data.data.length === 0) {
        return null;
      }

      return TwitchUserInfoSchema.parse(data.data[0]);
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // DISCONNECT
  // ==========================================================================

  /**
   * Disconnect from Twitch (revoke tokens and clear state)
   */
  async disconnect(): Promise<void> {
    const tokens = this.settingsService.getTwitchOAuthTokens();
    const settings = this.settingsService.getTwitchSettings();

    // Revoke token with Twitch (best effort)
    if (tokens?.accessToken && settings.clientId) {
      try {
        await fetch(TWITCH_OAUTH_ENDPOINTS.REVOKE, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: settings.clientId,
            token: tokens.accessToken,
          }),
        });
        this.logger.info("Token revoked with Twitch");
      } catch (error) {
        this.logger.warn("Failed to revoke token with Twitch", error);
      }
    }

    // Stop refresh timer
    this.stopRefreshTimer();

    // Clear stored tokens
    this.settingsService.saveTwitchOAuthTokens(null);

    // Clear pending OAuth state
    this.settingsService.saveTwitchOAuthState(null);

    // Update status
    this.updateStatus({
      ...DEFAULT_AUTH_STATUS,
      state: "disconnected",
    });

    this.logger.info("Disconnected from Twitch");
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Get the OAuth redirect URI
   */
  private getRedirectUri(): string {
    // Use NEXT_PUBLIC_APP_URL if set (should include protocol)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      // If it already has a protocol, use as-is
      if (appUrl.startsWith("http://") || appUrl.startsWith("https://")) {
        return `${appUrl}${TWITCH_OAUTH_CALLBACK_PATH}`;
      }
      // Otherwise, add https
      return `https://${appUrl}${TWITCH_OAUTH_CALLBACK_PATH}`;
    }

    // Default to localhost for development
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${protocol}://localhost:3000${TWITCH_OAUTH_CALLBACK_PATH}`;
  }

  /**
   * Create and set an auth error
   */
  private createAndSetError(type: TwitchAuthErrorType, message: string): Error {
    const error = createAuthError(type, message);

    this.updateStatus({
      state: "error",
      error,
    });

    this.broadcastError(error);

    return new Error(message);
  }

  /**
   * Reload tokens from database
   * Call this when tokens may have been updated by another process (e.g., Next.js OAuth callback)
   */
  async reloadFromDatabase(): Promise<void> {
    this.logger.info("Reloading tokens from database");

    // Force WAL checkpoint to see changes from other processes (Next.js)
    const db = DatabaseService.getInstance();
    db.checkpoint();
    this.logger.debug("WAL checkpoint completed");

    // Stop existing refresh timer
    this.stopRefreshTimer();

    // Reset state
    this.initialized = false;
    this.initializationPromise = null;

    // Reinitialize from stored tokens
    await this.initializeFromStoredTokens();
    this.initialized = true;

    this.logger.info("Tokens reloaded from database", {
      isAuthenticated: this.isAuthenticated(),
      user: this.status.user?.login,
    });
  }

  /**
   * Get credentials for external use (e.g., TwitchAPIClient)
   */
  getCredentials(): TwitchCredentials | null {
    const settings = this.settingsService.getTwitchSettings();
    const clientSecret = this.settingsService.getTwitchClientSecret();

    if (!settings.clientId || !clientSecret) {
      return null;
    }

    return {
      clientId: settings.clientId,
      clientSecret,
    };
  }

  /**
   * Check if credentials are configured
   */
  hasCredentials(): boolean {
    const settings = this.settingsService.getTwitchSettings();
    const clientSecret = this.settingsService.getTwitchClientSecret();
    return !!(settings.clientId && clientSecret);
  }
}
