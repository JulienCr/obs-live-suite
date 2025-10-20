import { NextResponse } from "next/server";
import { OBSStateManager } from "@/lib/adapters/obs/OBSStateManager";
import { OBSConnectionManager } from "@/lib/adapters/obs/OBSConnectionManager";

/**
 * GET /api/obs/status
 * Get current OBS status
 */
export async function GET() {
  try {
    const connectionManager = OBSConnectionManager.getInstance();
    const stateManager = OBSStateManager.getInstance();

    const status = connectionManager.getStatus();
    let state = stateManager.getState();

    // If connected but scene is null, refresh state
    if (connectionManager.isConnected() && !state.currentScene) {
      try {
        await stateManager.refreshState();
        state = stateManager.getState();
      } catch (error) {
        console.error("Failed to refresh OBS state:", error);
      }
    }

    return NextResponse.json({
      connected: connectionManager.isConnected(),
      status,
      ...state,
    });
  } catch (error) {
    console.error("OBS status API error:", error);
    return NextResponse.json(
      { error: "Failed to get OBS status" },
      { status: 500 }
    );
  }
}

