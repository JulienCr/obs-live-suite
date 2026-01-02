import { NextResponse } from "next/server";
import { SettingsService } from "@/lib/services/SettingsService";

/**
 * GET /api/settings/general
 * Get general UI settings
 */
export async function GET() {
  try {
    const settingsService = SettingsService.getInstance();
    const settings = settingsService.getGeneralSettings();
    const chatMessageSettings = settingsService.getChatMessageSettings();

    return NextResponse.json({
      settings: {
        ...settings,
        ...chatMessageSettings,
      }
    });
  } catch (error) {
    console.error("Failed to get general settings:", error);
    return NextResponse.json(
      { error: "Failed to get general settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/general
 * Save general UI settings
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { defaultPosterDisplayMode, posterChatMessageEnabled, guestChatMessageEnabled } = body;

    const settingsService = SettingsService.getInstance();

    // Validate display mode if provided
    const validModes = ["left", "right", "bigpicture"];
    if (defaultPosterDisplayMode && !validModes.includes(defaultPosterDisplayMode)) {
      return NextResponse.json(
        { error: "Invalid display mode. Must be 'left', 'right', or 'bigpicture'" },
        { status: 400 }
      );
    }

    // Save general settings
    if (defaultPosterDisplayMode) {
      settingsService.saveGeneralSettings({ defaultPosterDisplayMode });
    }

    // Save chat message settings
    if (posterChatMessageEnabled !== undefined || guestChatMessageEnabled !== undefined) {
      settingsService.saveChatMessageSettings({
        posterChatMessageEnabled,
        guestChatMessageEnabled,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
    });
  } catch (error) {
    console.error("Failed to save general settings:", error);
    return NextResponse.json(
      { error: "Failed to save general settings" },
      { status: 500 }
    );
  }
}
