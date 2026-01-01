import { NextResponse } from "next/server";
import { SettingsService } from "@/lib/services/SettingsService";

/**
 * GET /api/settings/overlay
 * Get overlay settings (timeouts, auto-hide)
 */
export async function GET() {
  try {
    const settingsService = SettingsService.getInstance();
    const settings = settingsService.getOverlaySettings();

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to get overlay settings:", error);
    return NextResponse.json(
      { error: "Failed to get overlay settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/overlay
 * Save overlay settings
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lowerThirdDuration, chatHighlightDuration, chatHighlightAutoHide } = body;

    // Validate durations (1-60 seconds)
    if (lowerThirdDuration !== undefined) {
      if (typeof lowerThirdDuration !== "number" || lowerThirdDuration < 1 || lowerThirdDuration > 60) {
        return NextResponse.json(
          { error: "lowerThirdDuration must be a number between 1 and 60" },
          { status: 400 }
        );
      }
    }

    if (chatHighlightDuration !== undefined) {
      if (typeof chatHighlightDuration !== "number" || chatHighlightDuration < 1 || chatHighlightDuration > 60) {
        return NextResponse.json(
          { error: "chatHighlightDuration must be a number between 1 and 60" },
          { status: 400 }
        );
      }
    }

    if (chatHighlightAutoHide !== undefined && typeof chatHighlightAutoHide !== "boolean") {
      return NextResponse.json(
        { error: "chatHighlightAutoHide must be a boolean" },
        { status: 400 }
      );
    }

    const settingsService = SettingsService.getInstance();
    settingsService.saveOverlaySettings({
      lowerThirdDuration,
      chatHighlightDuration,
      chatHighlightAutoHide,
    });

    return NextResponse.json({
      success: true,
      message: "Overlay settings saved successfully",
    });
  } catch (error) {
    console.error("Failed to save overlay settings:", error);
    return NextResponse.json(
      { error: "Failed to save overlay settings" },
      { status: 500 }
    );
  }
}
