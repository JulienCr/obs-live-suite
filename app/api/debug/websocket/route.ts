import { NextResponse } from "next/server";
import { BackendClient } from "@/lib/utils/BackendClient";

/**
 * Debug endpoint to check WebSocket connections
 * Proxies to backend server
 */
export async function GET() {
  try {
    const stats = await BackendClient.getStats();
    
    return NextResponse.json({
      isRunning: stats.isRunning,
      totalClients: stats.clients,
      lowerSubscribers: stats.channels.lower || 0,
      countdownSubscribers: stats.channels.countdown || 0,
      posterSubscribers: stats.channels.poster || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error), message: 'Backend server may not be running' },
      { status: 500 }
    );
  }
}

