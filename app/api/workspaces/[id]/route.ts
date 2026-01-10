import { WorkspaceService } from "@/lib/services/WorkspaceService";
import { ApiResponses, withErrorHandler } from "@/lib/utils/ApiResponses";

/**
 * GET workspace by ID (includes full layoutJson)
 */
export const GET = withErrorHandler<{ id: string }>(
  async (_request, context) => {
    const { id } = await context.params;
    const service = WorkspaceService.getInstance();
    const workspace = service.getWorkspaceById(id);

    if (!workspace) {
      return ApiResponses.notFound("Workspace");
    }

    return ApiResponses.ok({ workspace });
  },
  "[WorkspacesAPI]"
);

/**
 * PUT update a workspace
 * Body: { name?: string, description?: string, layoutJson?: string, panelColors?: Record<string, string> }
 */
export const PUT = withErrorHandler<{ id: string }>(
  async (request, context) => {
    const { id } = await context.params;
    const body = await request.json();
    const { name, description, layoutJson, panelColors } = body;

    const service = WorkspaceService.getInstance();
    const existing = service.getWorkspaceById(id);

    if (!existing) {
      return ApiResponses.notFound("Workspace");
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return ApiResponses.badRequest("Name cannot be empty");
      }
      if (name.length > 50) {
        return ApiResponses.badRequest("Name must be 50 characters or less");
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
    return ApiResponses.ok({ workspace: updated });
  },
  "[WorkspacesAPI]"
);

/**
 * DELETE a workspace (fails for built-in workspaces)
 */
export const DELETE = withErrorHandler<{ id: string }>(
  async (_request, context) => {
    const { id } = await context.params;
    const service = WorkspaceService.getInstance();
    const existing = service.getWorkspaceById(id);

    if (!existing) {
      return ApiResponses.notFound("Workspace");
    }

    if (existing.isBuiltIn) {
      return ApiResponses.forbidden("Cannot delete built-in workspaces");
    }

    service.deleteWorkspace(id);
    return ApiResponses.ok({ success: true });
  },
  "[WorkspacesAPI]"
);
