import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Countdown]";

/**
 * POST /api/actions/countdown/start
 * Start countdown (Stream Deck compatible, proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { seconds, style, format, position, size, theme } = body;

  if (!seconds || seconds <= 0) {
    return ApiResponses.badRequest("Valid seconds value required");
  }

  // Prepare the payload with all customization options
  const payload = {
    seconds,
    ...(style && { style }),
    ...(format && { format }),
    ...(position && { position }),
    ...(size && { size }),
    ...(theme && { theme }),
  };

  // Set the countdown time with customization
  await proxyToBackend("/api/overlays/countdown", {
    method: "POST",
    body: { action: "set", payload },
    logPrefix: LOG_CONTEXT,
  });

  // Start it
  await proxyToBackend("/api/overlays/countdown", {
    method: "POST",
    body: { action: "start" },
    logPrefix: LOG_CONTEXT,
  });

  return ApiResponses.ok({ success: true });
}, LOG_CONTEXT);

