import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/profiles/[id]/activate
 * Activate a profile (deactivates all others)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = DatabaseService.getInstance();
    db.setActiveProfile(id);

    const profile = db.getProfileById(id);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to activate profile" },
      { status: 500 }
    );
  }
}

