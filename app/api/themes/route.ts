import { NextRequest } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { v4 as uuidv4 } from "uuid";
import { createThemeSchema, ThemeModel } from "@/lib/models/Theme";
import { ApiResponses } from "@/lib/utils/ApiResponses";

/**
 * GET all themes
 */
export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const themes = db.getAllThemes();
    return ApiResponses.ok({ themes });
  } catch (error) {
    console.error("[API] Failed to get themes:", error);
    return ApiResponses.serverError("Failed to get themes");
  }
}

/**
 * POST create a new theme
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createThemeSchema.parse(body);

    const theme = new ThemeModel({
      id: uuidv4(),
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const db = DatabaseService.getInstance();
    db.createTheme(theme.toJSON());

    return ApiResponses.created({ theme: theme.toJSON() });
  } catch (error) {
    console.error("[API] Failed to create theme:", error);
    return ApiResponses.badRequest(
      error instanceof Error ? error.message : "Failed to create theme"
    );
  }
}

