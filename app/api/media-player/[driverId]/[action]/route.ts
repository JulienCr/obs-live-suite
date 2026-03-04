import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[MediaPlayerAPI:Command]";

/**
 * POST /api/media-player/:driverId/:action
 * Send a command to a media player driver (proxies to backend)
 */
export const POST = withErrorHandler<{ driverId: string; action: string }>(
  async (_req, { params }) => {
    const { driverId, action } = await params;
    return proxyToBackend(`/api/media-player/${driverId}/${action}`, {
      method: "POST",
      errorMessage: "Media player command failed",
      logPrefix: LOG_CONTEXT,
    });
  },
  LOG_CONTEXT
);
