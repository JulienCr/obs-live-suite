import { NextResponse } from "next/server";
import { SettingsService } from "@/lib/services/SettingsService";
import { OBSConnectionManager } from "@/lib/adapters/obs/OBSConnectionManager";
import { OBSStateManager } from "@/lib/adapters/obs/OBSStateManager";

/**
 * GET /api/settings/obs
 * Get current OBS settings
 */
export async function GET() {
  try {
    const settingsService = SettingsService.getInstance();
    const settings = settingsService.getOBSSettings();
    
    // Never send password in plaintext - only indicate if it's set
    const response = {
      url: settings.url,
      hasPassword: !!settings.password,
      sourceIsDatabase: settingsService.hasOBSSettingsInDatabase(),
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get OBS settings:", error);
    return NextResponse.json(
      { error: "Failed to get OBS settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/obs
 * Save OBS settings and test connection
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, password, testOnly } = body;
    
    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const connectionManager = OBSConnectionManager.getInstance();
    
    // Test connection first
    try {
      await connectionManager.connectWithCredentials(url, password || undefined);
      
      // Get OBS version for confirmation
      const version = await connectionManager.getOBS().call("GetVersion");
      
      // If not test-only, save settings
      if (!testOnly) {
        const settingsService = SettingsService.getInstance();
        settingsService.saveOBSSettings({ url, password: password || undefined });
        
        // Refresh OBS state after successful connection
        const stateManager = OBSStateManager.getInstance();
        await stateManager.refreshState();
      }
      
      return NextResponse.json({
        success: true,
        message: "Connection successful",
        obsVersion: version.obsVersion,
        obsWebSocketVersion: version.obsWebSocketVersion,
        saved: !testOnly,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Connection failed",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Failed to save OBS settings:", error);
    return NextResponse.json(
      { error: "Failed to save OBS settings" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/obs
 * Clear OBS settings from database (fallback to .env)
 */
export async function DELETE() {
  try {
    const settingsService = SettingsService.getInstance();
    settingsService.clearOBSSettings();
    
    // Reconnect with environment variables
    const connectionManager = OBSConnectionManager.getInstance();
    await connectionManager.disconnect();
    await connectionManager.connect();
    
    return NextResponse.json({
      success: true,
      message: "Settings cleared, using environment variables",
    });
  } catch (error) {
    console.error("Failed to clear OBS settings:", error);
    return NextResponse.json(
      { error: "Failed to clear OBS settings" },
      { status: 500 }
    );
  }
}

