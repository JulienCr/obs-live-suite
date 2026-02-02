import { NextRequest } from "next/server";
import { ThemeRepository } from "@/lib/repositories/ThemeRepository";
import { v4 as uuidv4 } from "uuid";
import { createThemeSchema, ThemeModel } from "@/lib/models/Theme";
import { ApiResponses } from "@/lib/utils/ApiResponses";

/**
 * GET all themes
 */
export async function GET() {
  try {
    const themeRepo = ThemeRepository.getInstance();
    const themes = themeRepo.getAll();
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

    const themeRepo = ThemeRepository.getInstance();
    themeRepo.create(theme.toJSON());

    return ApiResponses.created({ theme: theme.toJSON() });
  } catch (error) {
    console.error("[API] Failed to create theme:", error);
    return ApiResponses.badRequest(
      error instanceof Error ? error.message : "Failed to create theme"
    );
  }
}

