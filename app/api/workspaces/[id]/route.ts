import { NextRequest, NextResponse } from "next/server";
import { WorkspaceService } from "@/lib/services/WorkspaceService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET workspace by ID (includes full layoutJson)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = WorkspaceService.getInstance();
    const workspace = service.getWorkspaceById(id);

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ workspace }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to get workspace:", error);
    return NextResponse.json(
      { error: "Failed to get workspace" },
      { status: 500 }
    );
  }
}

/**
 * PUT update a workspace
 * Body: { name?: string, description?: string, layoutJson?: string, panelColors?: Record<string, string> }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, layoutJson, panelColors } = body;

    const service = WorkspaceService.getInstance();
    const existing = service.getWorkspaceById(id);

    if (!existing) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      if (name.length > 50) {
        return NextResponse.json(
          { error: "Name must be 50 characters or less" },
          { status: 400 }
        );
      }
    }

    // Update metadata if only name/description provided
    if (name !== undefined || description !== undefined) {
      service.updateWorkspaceMetadata(id, {
        name: name?.trim(),
        description: description?.trim(),
      });
    }

    // Update layout if provided
    if (layoutJson !== undefined && panelColors !== undefined) {
      service.updateWorkspaceLayout(id, layoutJson, panelColors);
    }

    const updated = service.getWorkspaceById(id);
    return NextResponse.json({ workspace: updated }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to update workspace:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update workspace" },
      { status: 400 }
    );
  }
}

/**
 * DELETE a workspace (fails for built-in workspaces)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    if (existing.isBuiltIn) {
      return NextResponse.json(
        { error: "Cannot delete built-in workspaces" },
        { status: 403 }
      );
    }

    service.deleteWorkspace(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to delete workspace:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete workspace" },
      { status: 400 }
    );
  }
}
