import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import {
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[CueActionAPI]";

interface CueActionParams {
  messageId: string;
}

export const POST = withErrorHandler<CueActionParams>(
  async (request: Request, context: RouteContext<CueActionParams>) => {
    const { messageId } = await context.params;
    const body = await request.json();
    return proxyToBackend(`/api/cue/${messageId}/action`, {
      method: "POST",
      body,
      errorMessage: "Failed to perform action",
      logPrefix: LOG_CONTEXT,
    });
  },
  LOG_CONTEXT
);
