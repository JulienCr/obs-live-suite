import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";

/**
 * POST /api/profiles/[id]/activate
 * Activate a profile (deactivates all others)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = DatabaseService.getInstance();
    db.setActiveProfile(params.id);
    
    const profile = db.getProfileById(params.id);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to activate profile" },
      { status: 500 }
    );
  }
}

