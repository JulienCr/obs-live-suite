import { NextResponse } from "next/server";
import { ServerInit } from "@/lib/init/ServerInit";

/**
 * GET /api/init
 * Initialize server (called on first request)
 */
export async function GET() {
  try {
    const serverInit = ServerInit.getInstance();
    
    if (!ServerInit.isInitialized()) {
      await serverInit.initialize();
    }

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

