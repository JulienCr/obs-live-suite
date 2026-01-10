import { WorkspaceService } from "@/lib/services/WorkspaceService";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

/**
 * GET all workspace summaries (lightweight, for dropdowns)
 */
export const GET = withSimpleErrorHandler(async () => {
  const service = WorkspaceService.getInstance();
  const workspaces = service.getWorkspaceSummaries();
  return ApiResponses.ok({ workspaces });
}, "[WorkspacesAPI]");

/**
 * POST create a new workspace from current layout
 * Body: { name: string, description?: string, layoutJson: string, panelColors: Record<string, string> }
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { name, description, layoutJson, panelColors } = body;

  // Validate required fields
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return ApiResponses.badRequest("Name is required");
  }

  if (name.length > 50) {
    return ApiResponses.badRequest("Name must be 50 characters or less");
  }

  if (!layoutJson || typeof layoutJson !== "string") {
    return ApiResponses.badRequest("Layout JSON is required");
  }

  const service = WorkspaceService.getInstance();

  // Check for duplicate name
  if (service.isNameTaken(name.trim())) {
    return ApiResponses.conflict("A workspace with this name already exists");
  }

  const workspace = service.createFromCurrentLayout(
    name.trim(),
    description?.trim() || null,
    layoutJson,
    panelColors || {}
  );

  return ApiResponses.created({ workspace });
}, "[WorkspacesAPI]");
