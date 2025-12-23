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

    return NextResponse.json({ settings });
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
    const { defaultPosterDisplayMode } = body;

    // Validate display mode
    const validModes = ["left", "right", "bigpicture"];
    if (defaultPosterDisplayMode && !validModes.includes(defaultPosterDisplayMode)) {
      return NextResponse.json(
        { error: "Invalid display mode. Must be 'left', 'right', or 'bigpicture'" },
        { status: 400 }
      );
    }

    const settingsService = SettingsService.getInstance();
    settingsService.saveGeneralSettings({ defaultPosterDisplayMode });

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
