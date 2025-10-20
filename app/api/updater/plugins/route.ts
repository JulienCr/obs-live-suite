import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";

/**
 * GET /api/updater/plugins
 * Get all plugins
 */
export async function GET() {
  try {
    const db = DatabaseService.getInstance().getDb();
    const plugins = db.prepare("SELECT * FROM plugins").all();

    return NextResponse.json({ plugins });
  } catch (error) {
    console.error("Get plugins error:", error);
    return NextResponse.json(
      { error: "Failed to get plugins" },
      { status: 500 }
    );
  }
}

