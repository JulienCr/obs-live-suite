import { NextRequest, NextResponse } from "next/server";
import { OBSStateManager } from "@/lib/adapters/obs/OBSStateManager";

/**
 * POST /api/obs/record
 * Toggle recording
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const stateManager = OBSStateManager.getInstance();

    if (action === "start") {
      await stateManager.startRecording();
    } else if (action === "stop") {
      await stateManager.stopRecording();
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OBS record API error:", error);
    return NextResponse.json(
      { error: "Failed to control recording" },
      { status: 500 }
    );
  }
}

