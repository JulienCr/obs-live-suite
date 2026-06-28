import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { proxyToBackend } from "@/lib/utils/ProxyHelper";

const LOG_CONTEXT = "[LiveAssistProxy]";

// Forward the backend's real status/payload (proxyToBackend) instead of collapsing
// every non-2xx into a 422 — a 500/503 from the backend must not look like a 422.
export const POST = withSimpleErrorHandler(
  async () =>
    proxyToBackend("/api/live-assist/suggestions/clear", {
      method: "POST",
      body: {},
      errorMessage: "Failed to clear suggestions",
      logPrefix: LOG_CONTEXT,
    }),
  LOG_CONTEXT,
);
