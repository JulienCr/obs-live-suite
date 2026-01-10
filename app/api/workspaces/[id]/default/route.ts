import { WorkspaceService } from "@/lib/services/WorkspaceService";
import { ApiResponses, withErrorHandler } from "@/lib/utils/ApiResponses";

/**
 * POST set a workspace as the default
 */
export const POST = withErrorHandler<{ id: string }>(
  async (_request, context) => {
    const { id } = await context.params;
    const service = WorkspaceService.getInstance();
    const existing = service.getWorkspaceById(id);

    if (!existing) {
      return ApiResponses.notFound("Workspace");
    }

    service.setAsDefault(id);

    const updated = service.getWorkspaceById(id);
    return ApiResponses.ok({ workspace: updated });
  },
  "[WorkspacesAPI]"
);
