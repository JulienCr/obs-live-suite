import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { profileSchema } from "@/lib/models/Profile";
import { randomUUID } from "crypto";

/**
 * GET /api/profiles
 * List all profiles
 */
export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const profiles = db.getAllProfiles();
    
    return NextResponse.json({ profiles });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profiles
 * Create a new profile
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Create default theme ID if not provided
    const themeId = body.themeId || "default-theme";
    
    const profile = profileSchema.parse({
      id: randomUUID(),
      ...body,
      themeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const db = DatabaseService.getInstance();
    db.createProfile(profile);
    
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("Profile creation error:", error);
    return NextResponse.json(
      { error: "Failed to create profile" },
      { status: 400 }
    );
  }
}

