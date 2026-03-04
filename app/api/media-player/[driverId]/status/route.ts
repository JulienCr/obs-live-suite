import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[MediaPlayerAPI:DriverStatus]";

/**
 * GET /api/media-player/:driverId/status
 * Get status of a specific media player driver (proxies to backend)
 */
export const GET = withErrorHandler<{ driverId: string }>(
  async (_req, { params }) => {
    const { driverId } = await params;
    return proxyToBackend(`/api/media-player/${driverId}/status`, {
      method: "GET",
      errorMessage: "Failed to get driver status",
      logPrefix: LOG_CONTEXT,
    });
  },
  LOG_CONTEXT
);
