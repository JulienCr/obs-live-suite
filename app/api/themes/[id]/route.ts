import { NextRequest } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { updateThemeSchema, ThemeModel } from "@/lib/models/Theme";
import { ApiResponses } from "@/lib/utils/ApiResponses";

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
      return ApiResponses.notFound("Theme");
    }

    return ApiResponses.ok({ theme });
  } catch (error) {
    console.error("[API] Failed to get theme:", error);
    return ApiResponses.serverError("Failed to get theme");
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
      return ApiResponses.notFound("Theme");
    }

    const theme = ThemeModel.fromJSON(existing);
    theme.update({
      ...validated,
      updatedAt: new Date(),
    });

    db.updateTheme(id, theme.toJSON());

    return ApiResponses.ok({ theme: theme.toJSON() });
  } catch (error) {
    console.error("[API] Failed to update theme:", error);
    return ApiResponses.badRequest(
      error instanceof Error ? error.message : "Failed to update theme"
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
      return ApiResponses.notFound("Theme");
    }

    // Check if theme is in use by any profile
    const profiles = db.getAllProfiles();
    const inUse = profiles.some((p) => p.themeId === id);

    if (inUse) {
      return ApiResponses.conflict("Theme is in use by one or more profiles");
    }

    db.deleteTheme(id);

    return ApiResponses.ok({ success: true });
  } catch (error) {
    console.error("[API] Failed to delete theme:", error);
    return ApiResponses.serverError("Failed to delete theme");
  }
}

