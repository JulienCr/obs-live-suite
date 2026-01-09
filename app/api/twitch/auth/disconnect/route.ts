import { NextResponse } from "next/server";
import { TwitchOAuthManager } from "@/lib/services/twitch/TwitchOAuthManager";

const LOG_CONTEXT = "[TwitchAuth:Disconnect]";

/**
 * POST /api/twitch/auth/disconnect
 * Disconnects from Twitch by revoking tokens and clearing stored credentials.
 */
export async function POST() {
  try {
    const oauthManager = TwitchOAuthManager.getInstance();
    await oauthManager.disconnect();

    console.log(`${LOG_CONTEXT} Successfully disconnected from Twitch`);

    return NextResponse.json({
      success: true,
      message: "Disconnected from Twitch",
    });
  } catch (error) {
    console.error(`${LOG_CONTEXT} Failed to disconnect:`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to disconnect",
      },
      { status: 500 }
    );
  }
}
