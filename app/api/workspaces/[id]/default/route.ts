import { NextRequest, NextResponse } from "next/server";
import { WorkspaceService } from "@/lib/services/WorkspaceService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST set a workspace as the default
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = WorkspaceService.getInstance();
    const existing = service.getWorkspaceById(id);

    if (!existing) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    service.setAsDefault(id);

    const updated = service.getWorkspaceById(id);
    return NextResponse.json({ workspace: updated }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to set default workspace:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set default workspace" },
      { status: 400 }
    );
  }
}
