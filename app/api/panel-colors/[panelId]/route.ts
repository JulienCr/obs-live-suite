import { NextRequest, NextResponse } from "next/server";
import { PanelColorRepository } from "@/lib/repositories/PanelColorRepository";
import { PANEL_IDS } from "@/lib/models/PanelColor";

/**
 * GET a single panel color by panel ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ panelId: string }> }
) {
  try {
    const { panelId } = await params;
    const panelColorRepo = PanelColorRepository.getInstance();
    const panelColor = panelColorRepo.getPanelColorByPanelId(panelId);

    if (!panelColor) {
      return NextResponse.json({ panelColor: null }, { status: 200 });
    }

    return NextResponse.json({ panelColor }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to get panel color:", error);
    return NextResponse.json(
      { error: "Failed to get panel color" },
      { status: 500 }
    );
  }
}

/**
 * DELETE a panel color (reset to default)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ panelId: string }> }
) {
  try {
    const { panelId } = await params;

    // Validate panelId
    if (!PANEL_IDS.includes(panelId as typeof PANEL_IDS[number])) {
      return NextResponse.json(
        { error: `Invalid panelId. Must be one of: ${PANEL_IDS.join(", ")}` },
        { status: 400 }
      );
    }

    const panelColorRepo = PanelColorRepository.getInstance();
    panelColorRepo.deletePanelColor(panelId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to delete panel color:", error);
    return NextResponse.json(
      { error: "Failed to delete panel color" },
      { status: 500 }
    );
  }
}
