import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { updateProfileSchema } from "@/lib/models/Profile";

/**
 * PATCH /api/profiles/[id]
 * Update profile
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updates = updateProfileSchema.parse(body);
    
    const db = DatabaseService.getInstance();
    db.updateProfile(params.id, {
      ...updates,
      updatedAt: new Date(),
    });
    
    const profile = db.getProfileById(params.id);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile update error:", error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: "Validation failed", details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/profiles/[id]
 * Update profile (same as PATCH)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updates = updateProfileSchema.parse(body);
    
    const db = DatabaseService.getInstance();
    db.updateProfile(params.id, {
      ...updates,
      updatedAt: new Date(),
    });
    
    const profile = db.getProfileById(params.id);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile update error:", error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: "Validation failed", details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/profiles/[id]
 * Delete profile
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = DatabaseService.getInstance();
    db.deleteProfile(params.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete profile" },
      { status: 500 }
    );
  }
}

