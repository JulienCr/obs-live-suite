import { BackendClient } from "@/lib/utils/BackendClient";
import { fetchFromBackend } from "@/lib/utils/ProxyHelper";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TestAPI:LowerThird]";

/**
 * GET /api/test/lower-third
 * Test endpoint to trigger lower third (proxies to backend)
 */
export const GET = withSimpleErrorHandler(async () => {
  // Get stats first using BackendClient
  const stats = await BackendClient.getStats();
  console.log(`${LOG_CONTEXT} Lower third subscribers: ${stats.channels?.lower || 0}`);

  // Send test lower third using standardized helper
  const response = await fetchFromBackend("/api/overlays/lower", {
    method: "POST",
    body: {
      action: 'show',
      payload: {
        title: "Test Person",
        subtitle: "This is a test lower third!",
        side: "left",
        duration: 5, // Show for 5 seconds
      }
    },
    errorMessage: "Failed to trigger lower third",
    logPrefix: LOG_CONTEXT,
  });

  if (!response.ok) {
    throw new Error('Failed to trigger lower third');
  }

  return ApiResponses.ok({
    success: true,
    message: "Lower third triggered! Check your OBS browser source.",
    subscribers: stats.channels?.lower || 0,
    wsHubRunning: stats.isRunning,
  });
}, LOG_CONTEXT);

