import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * Test endpoint to trigger lower third (proxies to backend)
 */
export async function GET() {
  try {
    // Get stats first
    const statsResponse = await fetch(`${BACKEND_URL}/ws/stats`);
    const stats = await statsResponse.json();
    
    console.log(`[Test] Lower third subscribers: ${stats.channels?.lower || 0}`);
    
    // Send test lower third
    const response = await fetch(`${BACKEND_URL}/api/overlays/lower`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'show',
        payload: {
          title: "Test Person",
          subtitle: "This is a test lower third!",
          side: "left",
          duration: 5, // Show for 5 seconds
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to trigger lower third');
    }
    
    return NextResponse.json({
      success: true,
      message: "Lower third triggered! Check your OBS browser source.",
      subscribers: stats.channels?.lower || 0,
      wsHubRunning: stats.isRunning,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

