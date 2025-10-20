import { NextResponse } from "next/server";
import { ServiceEnsurer } from "@/lib/services/ServiceEnsurer";

/**
 * GET /api/init
 * Initialize server (called on first request)
 */
export async function GET() {
  try {
    // Ensure all services (including WebSocket) are running
    await ServiceEnsurer.ensureServices();

    return NextResponse.json({ 
      initialized: true,
      message: "Server initialized successfully" 
    });
  } catch (error) {
    console.error("Initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize server" },
      { status: 500 }
    );
  }
}

