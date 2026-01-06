import { createGetProxy, createPostProxy } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PresenterAPI:Rooms]";

/**
 * GET /api/presenter/rooms
 * List all rooms
 */
export const GET = createGetProxy("/api/rooms", "Failed to fetch rooms", LOG_CONTEXT);

const proxyPost = createPostProxy("/api/rooms", "Failed to create room", LOG_CONTEXT);

/**
 * POST /api/presenter/rooms
 * Create a new room
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyPost(body);
}, LOG_CONTEXT);
