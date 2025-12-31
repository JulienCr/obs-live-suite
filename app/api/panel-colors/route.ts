import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { panelColorUpdateSchema, PANEL_IDS } from "@/lib/models/PanelColor";

/**
 * GET all panel colors
 */
export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const colors = db.getAllPanelColors();
    return NextResponse.json({ colors }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to get panel colors:", error);
    return NextResponse.json(
      { error: "Failed to get panel colors" },
      { status: 500 }
    );
  }
}

/**
 * POST upsert a panel color
 * Body: { panelId: string, ...colors }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { panelId, ...colorUpdates } = body;

    // Validate panelId
    if (!panelId || !PANEL_IDS.includes(panelId)) {
      return NextResponse.json(
        { error: `Invalid panelId. Must be one of: ${PANEL_IDS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate color updates
    const validated = panelColorUpdateSchema.parse(colorUpdates);

    const db = DatabaseService.getInstance();
    const panelColor = db.upsertPanelColor(panelId, validated);

    return NextResponse.json({ panelColor }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to upsert panel color:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upsert panel color" },
      { status: 400 }
    );
  }
}
