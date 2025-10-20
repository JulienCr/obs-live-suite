import { NextResponse } from "next/server";
import { OBSStateManager } from "@/lib/adapters/obs/OBSStateManager";
import { OBSConnectionManager } from "@/lib/adapters/obs/OBSConnectionManager";
import { OBSConnectionEnsurer } from "@/lib/adapters/obs/OBSConnectionEnsurer";

/**
 * GET /api/obs/status
 * Get current OBS status
 */
export async function GET() {
  try {
    // Ensure connection (handles dev mode process isolation)
    await OBSConnectionEnsurer.ensureConnected();

    const connectionManager = OBSConnectionManager.getInstance();
    const stateManager = OBSStateManager.getInstance();

    const status = connectionManager.getStatus();
    const isConnected = connectionManager.isConnected();
    let state = stateManager.getState();

    // If connected but scene is null, refresh state
    if (isConnected && !state.currentScene) {
      try {
        await stateManager.refreshState();
        state = stateManager.getState();
      } catch (error) {
        console.error("Failed to refresh OBS state:", error);
      }
    }

    return NextResponse.json({
      connected: isConnected,
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

