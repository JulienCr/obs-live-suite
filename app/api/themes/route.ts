import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { v4 as uuidv4 } from "uuid";
import { createThemeSchema, ThemeModel } from "@/lib/models/Theme";

/**
 * GET all themes
 */
export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const themes = db.getAllThemes();
    return NextResponse.json({ themes }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to get themes:", error);
    return NextResponse.json(
      { error: "Failed to get themes" },
      { status: 500 }
    );
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

    return NextResponse.json({ theme: theme.toJSON() }, { status: 201 });
  } catch (error: any) {
    console.error("[API] Failed to create theme:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create theme" },
      { status: 400 }
    );
  }
}

