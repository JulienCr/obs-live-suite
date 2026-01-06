import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import {
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PresenterAPI:Rooms:Clear]";

/**
 * DELETE /api/presenter/rooms/[id]/clear
 * Clear all messages from a room
 */
export const DELETE = withErrorHandler<{ id: string }>(
  async (_request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    return proxyToBackend(`/api/cue/${id}/clear`, {
      method: "DELETE",
      errorMessage: "Failed to clear messages",
      logPrefix: LOG_CONTEXT,
    });
  },
  LOG_CONTEXT
);
