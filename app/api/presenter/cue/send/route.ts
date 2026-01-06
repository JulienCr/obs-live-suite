import { createPostProxy } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PresenterAPI:Cue:Send]";

const proxyPost = createPostProxy("/api/cue/send", "Failed to send cue", LOG_CONTEXT);

export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyPost(body);
}, LOG_CONTEXT);
