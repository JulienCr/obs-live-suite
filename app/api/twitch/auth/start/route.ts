import { NextRequest, NextResponse } from "next/server";
import { TwitchOAuthManager } from "@/lib/services/twitch/TwitchOAuthManager";
import { SettingsService } from "@/lib/services/SettingsService";

const LOG_CONTEXT = "[TwitchAuth:Start]";

/**
 * GET /api/twitch/auth/start
 * Initiates the Twitch OAuth authorization flow.
 * Returns a redirect URL to Twitch's authorization page.
 *
 * Query params:
 * - returnUrl: Optional URL to redirect to after successful auth
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const returnUrl = searchParams.get("returnUrl") || undefined;

    // Check if credentials are configured
    const settingsService = SettingsService.getInstance();
    if (!settingsService.hasTwitchCredentials()) {
      return NextResponse.json(
        {
          success: false,
          error: "Twitch credentials not configured",
          message: "Please configure Client ID and Client Secret in settings first",
        },
        { status: 400 }
      );
    }

    // Start OAuth flow
    const oauthManager = TwitchOAuthManager.getInstance();
    const { authUrl, state } = oauthManager.startAuthFlow(returnUrl);

    console.log(`${LOG_CONTEXT} Started OAuth flow, state: ${state.substring(0, 8)}...`);

    // Return redirect URL (client will handle redirect)
    return NextResponse.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error) {
    console.error(`${LOG_CONTEXT} Failed to start OAuth flow:`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start OAuth flow",
      },
      { status: 500 }
    );
  }
}
