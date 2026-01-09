/**
 * Twitch OAuth Authentication Models
 *
 * Zod schemas and types for Twitch OAuth flow, token management,
 * and authentication state machine.
 */

import { z } from "zod";

// ============================================================================
// OAUTH CONFIGURATION
// ============================================================================

/**
 * OAuth scopes required for the application
 * - channel:manage:broadcast - Update stream title and category
 * - user:read:email - Get user email for identification
 * - chat:read - Read chat messages
 * - chat:edit - Send chat messages
 * - user:write:chat - Send chat messages via API
 * - user:read:chat - Read chat messages via API
 */
export const TWITCH_OAUTH_SCOPES = [
  "channel:manage:broadcast",
  "user:read:email",
  "chat:read",
  "chat:edit",
  "user:write:chat",
  "user:read:chat",
] as const;

/**
 * Twitch OAuth endpoints
 */
export const TWITCH_OAUTH_ENDPOINTS = {
  AUTHORIZE: "https://id.twitch.tv/oauth2/authorize",
  TOKEN: "https://id.twitch.tv/oauth2/token",
  VALIDATE: "https://id.twitch.tv/oauth2/validate",
  REVOKE: "https://id.twitch.tv/oauth2/revoke",
} as const;

/**
 * OAuth callback path (relative to app root)
 */
export const TWITCH_OAUTH_CALLBACK_PATH = "/api/twitch/auth/callback";

// ============================================================================
// AUTH STATE MACHINE
// ============================================================================

/**
 * Authentication state machine states
 */
export const TwitchAuthState = z.enum([
  "disconnected",  // No tokens, not authenticated
  "authorizing",   // OAuth flow in progress
  "authorized",    // Valid tokens, authenticated
  "refreshing",    // Token refresh in progress
  "error",         // Authentication error occurred
]);

export type TwitchAuthState = z.infer<typeof TwitchAuthState>;

/**
 * Valid state transitions for the auth state machine
 */
export const VALID_AUTH_TRANSITIONS: Record<TwitchAuthState, TwitchAuthState[]> = {
  disconnected: ["authorizing", "authorized"],  // authorized: for restoring from stored tokens
  authorizing: ["authorized", "error", "disconnected"],
  authorized: ["refreshing", "disconnected", "error"],
  refreshing: ["authorized", "error"],
  error: ["disconnected", "authorizing"],
};

// ============================================================================
// AUTH STATUS SCHEMAS
// ============================================================================

/**
 * Authentication error types
 */
export const TwitchAuthErrorType = z.enum([
  "invalid_state",        // State parameter mismatch (CSRF)
  "invalid_code",         // Authorization code invalid
  "token_expired",        // Access token expired
  "refresh_failed",       // Failed to refresh token
  "api_error",            // Twitch API error
  "network_error",        // Network connectivity issue
  "invalid_credentials",  // Client ID/Secret invalid
  "missing_credentials",  // No credentials configured
  "scope_mismatch",       // Returned scopes don't match requested
]);

export type TwitchAuthErrorType = z.infer<typeof TwitchAuthErrorType>;

/**
 * Authentication error information
 */
export const TwitchAuthErrorSchema = z.object({
  type: TwitchAuthErrorType,
  message: z.string(),
  timestamp: z.number(),
  recoverable: z.boolean().default(true),
});

export type TwitchAuthError = z.infer<typeof TwitchAuthErrorSchema>;

/**
 * Full authentication status
 */
export const TwitchAuthStatusSchema = z.object({
  /** Current auth state */
  state: TwitchAuthState,
  /** User info when authenticated */
  user: z.object({
    id: z.string(),
    login: z.string(),
    displayName: z.string(),
    email: z.string().optional(),
    profileImageUrl: z.string().optional(),
  }).nullable(),
  /** Token expiry timestamp (ms) when authorized */
  expiresAt: z.number().nullable(),
  /** Granted scopes when authorized */
  scopes: z.array(z.string()).nullable(),
  /** Error details when in error state */
  error: TwitchAuthErrorSchema.nullable(),
  /** Last successful auth timestamp */
  lastAuthTime: z.number().nullable(),
});

export type TwitchAuthStatus = z.infer<typeof TwitchAuthStatusSchema>;

/**
 * Default auth status (disconnected)
 */
export const DEFAULT_AUTH_STATUS: TwitchAuthStatus = {
  state: "disconnected",
  user: null,
  expiresAt: null,
  scopes: null,
  error: null,
  lastAuthTime: null,
};

// ============================================================================
// OAUTH FLOW SCHEMAS
// ============================================================================

/**
 * OAuth state stored during authorization flow
 */
export const TwitchOAuthStateSchema = z.object({
  /** Random state parameter for CSRF protection */
  state: z.string(),
  /** PKCE code verifier */
  codeVerifier: z.string(),
  /** When the state was created (for expiry) */
  createdAt: z.number(),
  /** Redirect URL after successful auth */
  returnUrl: z.string().optional(),
});

export type TwitchOAuthState = z.infer<typeof TwitchOAuthStateSchema>;

/**
 * OAuth callback query parameters
 */
export const TwitchOAuthCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export type TwitchOAuthCallback = z.infer<typeof TwitchOAuthCallbackSchema>;

/**
 * Token response from Twitch OAuth
 */
export const TwitchTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.array(z.string()),
  token_type: z.literal("bearer"),
});

export type TwitchTokenResponse = z.infer<typeof TwitchTokenResponseSchema>;

/**
 * Token validation response from Twitch
 */
export const TwitchValidateResponseSchema = z.object({
  client_id: z.string(),
  login: z.string(),
  scopes: z.array(z.string()),
  user_id: z.string(),
  expires_in: z.number(),
});

export type TwitchValidateResponse = z.infer<typeof TwitchValidateResponseSchema>;

/**
 * User info from Twitch API
 */
export const TwitchUserInfoSchema = z.object({
  id: z.string(),
  login: z.string(),
  display_name: z.string(),
  email: z.string().optional(),
  profile_image_url: z.string().optional(),
});

export type TwitchUserInfo = z.infer<typeof TwitchUserInfoSchema>;

// ============================================================================
// CREDENTIALS SCHEMAS
// ============================================================================

/**
 * Twitch application credentials (Client ID + Secret)
 */
export const TwitchCredentialsSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
});

export type TwitchCredentials = z.infer<typeof TwitchCredentialsSchema>;

/**
 * Request to save Twitch credentials
 */
export const SaveTwitchCredentialsSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

export type SaveTwitchCredentials = z.infer<typeof SaveTwitchCredentialsSchema>;

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

/**
 * WebSocket channel for Twitch auth events
 */
export const TWITCH_AUTH_WS_CHANNEL = "twitch-auth" as const;

/**
 * Twitch auth WebSocket event types
 */
export type TwitchAuthEvent =
  | { type: "auth-status"; data: TwitchAuthStatus }
  | { type: "auth-error"; data: TwitchAuthError }
  | { type: "token-refreshed"; data: { expiresAt: number } };

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a state transition is valid
 */
export function isValidAuthTransition(from: TwitchAuthState, to: TwitchAuthState): boolean {
  return VALID_AUTH_TRANSITIONS[from].includes(to);
}

/**
 * Create an auth error object
 */
export function createAuthError(
  type: TwitchAuthErrorType,
  message: string,
  recoverable = true
): TwitchAuthError {
  return {
    type,
    message,
    timestamp: Date.now(),
    recoverable,
  };
}

/**
 * Check if auth status indicates a valid connection
 */
export function isAuthenticated(status: TwitchAuthStatus): boolean {
  return status.state === "authorized" && status.user !== null;
}

/**
 * Get time until token expiry in milliseconds
 */
export function getTimeUntilExpiry(status: TwitchAuthStatus): number | null {
  if (!status.expiresAt) return null;
  return status.expiresAt - Date.now();
}
