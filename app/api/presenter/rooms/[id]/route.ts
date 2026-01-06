import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import {
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PresenterAPI:Rooms]";

/**
 * GET /api/presenter/rooms/[id]
 * Get a room by ID
 */
export const GET = withErrorHandler<{ id: string }>(
  async (_request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    return proxyToBackend(`/api/rooms/${id}`, {
      errorMessage: "Failed to fetch room",
      logPrefix: LOG_CONTEXT,
    });
  },
  LOG_CONTEXT
);

/**
 * PUT /api/presenter/rooms/[id]
 * Update a room
 */
export const PUT = withErrorHandler<{ id: string }>(
  async (request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await request.json();
    return proxyToBackend(`/api/rooms/${id}`, {
      method: "PUT",
      body,
      errorMessage: "Failed to update room",
      logPrefix: LOG_CONTEXT,
    });
  },
  LOG_CONTEXT
);

/**
 * DELETE /api/presenter/rooms/[id]
 * Delete a room
 */
export const DELETE = withErrorHandler<{ id: string }>(
  async (_request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    return proxyToBackend(`/api/rooms/${id}`, {
      method: "DELETE",
      errorMessage: "Failed to delete room",
      logPrefix: LOG_CONTEXT,
    });
  },
  LOG_CONTEXT
);
