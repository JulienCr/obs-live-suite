import { NextRequest, NextResponse } from "next/server";
import { SettingsService } from "@/lib/services/SettingsService";
import { TwitchOAuthManager } from "@/lib/services/twitch/TwitchOAuthManager";
import { SaveTwitchCredentialsSchema } from "@/lib/models/TwitchAuth";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchSettings]";

/**
 * GET /api/settings/twitch
 * Get Twitch integration settings and connection status.
 * Client Secret is masked for security.
 */
export const GET = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  const oauthManager = TwitchOAuthManager.getInstance();

  const settings = settingsService.getTwitchSettings();
  const clientSecret = settingsService.getTwitchClientSecret();
  const authStatus = oauthManager.getStatus();

  return ApiResponses.ok({
    // Credentials (secret masked)
    clientId: settings.clientId || "",
    clientSecretSet: !!clientSecret,
    clientSecretMasked: clientSecret ? "••••••••" + clientSecret.slice(-4) : "",

    // Integration settings
    enabled: settings.enabled,
    pollIntervalMs: settings.pollIntervalMs,

    // Auth status
    authStatus: {
      state: authStatus.state,
      user: authStatus.user,
      expiresAt: authStatus.expiresAt,
      scopes: authStatus.scopes,
      error: authStatus.error,
    },

    // Convenience flags
    isConnected: authStatus.state === "authorized",
    hasCredentials: !!(settings.clientId && clientSecret),
  });
}, LOG_CONTEXT);

/**
 * POST /api/settings/twitch
 * Save Twitch credentials (Client ID and Client Secret).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const parseResult = SaveTwitchCredentialsSchema.safeParse(body);
    if (!parseResult.success) {
      console.error(`${LOG_CONTEXT} Invalid request body:`, parseResult.error.flatten());
      return ApiResponses.badRequest("Invalid request body");
    }

    const { clientId, clientSecret } = parseResult.data;
    const settingsService = SettingsService.getInstance();

    // Save credentials
    settingsService.saveTwitchSettings({ clientId });
    settingsService.saveTwitchClientSecret(clientSecret);

    console.log(`${LOG_CONTEXT} Twitch credentials saved`);

    return ApiResponses.ok({
      message: "Twitch credentials saved successfully",
      clientId,
      clientSecretSet: true,
    });
  } catch (error) {
    console.error(`${LOG_CONTEXT} Failed to save credentials:`, error);
    return ApiResponses.serverError(
      error instanceof Error ? error.message : "Failed to save credentials"
    );
  }
}

/**
 * DELETE /api/settings/twitch
 * Clear all Twitch settings and disconnect.
 */
export async function DELETE() {
  try {
    const settingsService = SettingsService.getInstance();
    const oauthManager = TwitchOAuthManager.getInstance();

    // Disconnect first (revokes tokens)
    await oauthManager.disconnect();

    // Clear all settings
    settingsService.clearTwitchSettings();

    console.log(`${LOG_CONTEXT} Twitch settings cleared`);

    return ApiResponses.ok({
      message: "Twitch settings cleared successfully",
    });
  } catch (error) {
    console.error(`${LOG_CONTEXT} Failed to clear settings:`, error);
    return ApiResponses.serverError(
      error instanceof Error ? error.message : "Failed to clear settings"
    );
  }
}

/**
 * PATCH /api/settings/twitch
 * Update specific Twitch settings (enabled, pollIntervalMs).
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const settingsService = SettingsService.getInstance();

    const updates: { enabled?: boolean; pollIntervalMs?: number } = {};

    if (typeof body.enabled === "boolean") {
      updates.enabled = body.enabled;
    }

    if (typeof body.pollIntervalMs === "number") {
      // Clamp to valid range
      updates.pollIntervalMs = Math.max(10000, Math.min(300000, body.pollIntervalMs));
    }

    if (Object.keys(updates).length === 0) {
      return ApiResponses.badRequest("No valid fields to update");
    }

    settingsService.saveTwitchSettings(updates);

    console.log(`${LOG_CONTEXT} Twitch settings updated:`, updates);

    return ApiResponses.ok({
      message: "Twitch settings updated",
      ...updates,
    });
  } catch (error) {
    console.error(`${LOG_CONTEXT} Failed to update settings:`, error);
    return ApiResponses.serverError(
      error instanceof Error ? error.message : "Failed to update settings"
    );
  }
}
