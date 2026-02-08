import { NextRequest, NextResponse } from "next/server";
import { PanelColorRepository } from "@/lib/repositories/PanelColorRepository";
import { PANEL_IDS, COLOR_SCHEMES } from "@/lib/models/PanelColor";

/**
 * GET all panel colors
 */
export async function GET() {
  try {
    const panelColorRepo = PanelColorRepository.getInstance();
    const colors = panelColorRepo.getAllPanelColors();
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
 * POST upsert a panel color scheme
 * Body: { panelId: string, scheme: ColorScheme }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { panelId, scheme } = body;

    // Validate panelId
    if (!panelId || !PANEL_IDS.includes(panelId)) {
      return NextResponse.json(
        { error: `Invalid panelId. Must be one of: ${PANEL_IDS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate scheme
    if (!scheme || !COLOR_SCHEMES.includes(scheme)) {
      return NextResponse.json(
        { error: `Invalid scheme. Must be one of: ${COLOR_SCHEMES.join(", ")}` },
        { status: 400 }
      );
    }

    const panelColorRepo = PanelColorRepository.getInstance();
    const panelColor = panelColorRepo.upsertPanelColor(panelId, scheme);

    return NextResponse.json({ panelColor }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to upsert panel color:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upsert panel color" },
      { status: 400 }
    );
  }
}
