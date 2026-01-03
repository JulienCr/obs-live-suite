import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { updateProfileSchema } from "@/lib/models/Profile";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/profiles/[id]
 * Update profile
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates = updateProfileSchema.parse(body);

    const db = DatabaseService.getInstance();
    db.updateProfile(id, {
      ...updates,
      updatedAt: new Date(),
    });

    const profile = db.getProfileById(id);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile update error:", error);

    if (error instanceof Error && error.name === "ZodError") {
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
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates = updateProfileSchema.parse(body);

    const db = DatabaseService.getInstance();
    db.updateProfile(id, {
      ...updates,
      updatedAt: new Date(),
    });

    const profile = db.getProfileById(id);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile update error:", error);

    if (error instanceof Error && error.name === "ZodError") {
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
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = DatabaseService.getInstance();
    db.deleteProfile(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete profile" },
      { status: 500 }
    );
  }
}

