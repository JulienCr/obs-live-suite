import { NextRequest, NextResponse } from "next/server";
import { WorkspaceService } from "@/lib/services/WorkspaceService";

/**
 * GET all workspace summaries (lightweight, for dropdowns)
 */
export async function GET() {
  try {
    const service = WorkspaceService.getInstance();
    const workspaces = service.getWorkspaceSummaries();
    return NextResponse.json({ workspaces }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to get workspaces:", error);
    return NextResponse.json(
      { error: "Failed to get workspaces" },
      { status: 500 }
    );
  }
}

/**
 * POST create a new workspace from current layout
 * Body: { name: string, description?: string, layoutJson: string, panelColors: Record<string, string> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, layoutJson, panelColors } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: "Name must be 50 characters or less" },
        { status: 400 }
      );
    }

    if (!layoutJson || typeof layoutJson !== "string") {
      return NextResponse.json(
        { error: "Layout JSON is required" },
        { status: 400 }
      );
    }

    const service = WorkspaceService.getInstance();

    // Check for duplicate name
    if (service.isNameTaken(name.trim())) {
      return NextResponse.json(
        { error: "A workspace with this name already exists" },
        { status: 409 }
      );
    }

    const workspace = service.createFromCurrentLayout(
      name.trim(),
      description?.trim() || null,
      layoutJson,
      panelColors || {}
    );

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to create workspace:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create workspace" },
      { status: 400 }
    );
  }
}
