import { withErrorHandler, ApiResponses, type RouteContext } from "@/lib/utils/ApiResponses";
import { BACKEND_URL } from "@/lib/config/urls";

export const POST = withErrorHandler(async (_request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const r = await fetch(`${BACKEND_URL}/api/live-assist/suggestions/${id}/dismiss`, { method: "POST" });
  if (!r.ok) return ApiResponses.unprocessable("dismiss failed");
  return ApiResponses.ok({ ok: true });
}, "[LiveAssistProxy]");
