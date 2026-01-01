import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { updateThemeSchema, ThemeModel } from "@/lib/models/Theme";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET a single theme by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = DatabaseService.getInstance();
    const theme = db.getThemeById(id);

    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    return NextResponse.json({ theme }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to get theme:", error);
    return NextResponse.json(
      { error: "Failed to get theme" },
      { status: 500 }
    );
  }
}

/**
 * PUT update a theme
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateThemeSchema.parse({ ...body, id });

    const db = DatabaseService.getInstance();
    const existing = db.getThemeById(id);

    if (!existing) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    const theme = ThemeModel.fromJSON(existing);
    theme.update({
      ...validated,
      updatedAt: new Date(),
    });

    db.updateTheme(id, theme.toJSON());

    return NextResponse.json({ theme: theme.toJSON() }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to update theme:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update theme" },
      { status: 400 }
    );
  }
}

/**
 * DELETE a theme
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = DatabaseService.getInstance();
    const theme = db.getThemeById(id);

    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }

    // Check if theme is in use by any profile
    const profiles = db.getAllProfiles();
    const inUse = profiles.some((p) => p.themeId === id);

    if (inUse) {
      return NextResponse.json(
        { error: "Theme is in use by one or more profiles" },
        { status: 400 }
      );
    }

    db.deleteTheme(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to delete theme:", error);
    return NextResponse.json(
      { error: "Failed to delete theme" },
      { status: 500 }
    );
  }
}

