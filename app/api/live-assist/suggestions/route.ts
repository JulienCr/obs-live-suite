import { withSimpleErrorHandler, ApiResponses } from "@/lib/utils/ApiResponses";
import { BACKEND_URL } from "@/lib/config/urls";

export const GET = withSimpleErrorHandler(async () => {
  const r = await fetch(`${BACKEND_URL}/api/live-assist/suggestions`);
  if (!r.ok) return ApiResponses.serviceUnavailable("live-assist backend unavailable");
  const data = await r.json();
  return ApiResponses.ok(data);
}, "[LiveAssistProxy]");
