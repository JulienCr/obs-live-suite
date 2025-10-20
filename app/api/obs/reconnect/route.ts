import { NextResponse } from "next/server";
import { OBSConnectionManager } from "@/lib/adapters/obs/OBSConnectionManager";
import { OBSStateManager } from "@/lib/adapters/obs/OBSStateManager";

export async function POST() {
  try {
    const manager = OBSConnectionManager.getInstance();
    const stateManager = OBSStateManager.getInstance();
    
    // Disconnect first if connected
    await manager.disconnect();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Attempt to reconnect
    await manager.connect();
    
    // Refresh state to get current scene and status
    await stateManager.refreshState();
    
    const state = stateManager.getState();
    
    return NextResponse.json({
      success: true,
      message: "Reconnected to OBS successfully",
      currentScene: state.currentScene
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

