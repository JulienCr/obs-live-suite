import { withSimpleErrorHandler, ApiResponses } from "@/lib/utils/ApiResponses";
import { BACKEND_URL } from "@/lib/config/urls";

export const POST = withSimpleErrorHandler(async () => {
  const r = await fetch(`${BACKEND_URL}/api/live-assist/suggestions/clear`, { method: "POST" });
  if (!r.ok) return ApiResponses.unprocessable("clear failed");
  return ApiResponses.ok({ ok: true });
}, "[LiveAssistProxy]");
