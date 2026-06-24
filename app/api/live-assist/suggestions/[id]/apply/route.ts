import { withErrorHandler, ApiResponses, type RouteContext } from "@/lib/utils/ApiResponses";
import { BACKEND_URL } from "@/lib/config/urls";

export const POST = withErrorHandler(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const body = await request.json();
  const r = await fetch(`${BACKEND_URL}/api/live-assist/suggestions/${id}/apply`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) return ApiResponses.unprocessable((await r.json()).error ?? "apply failed");
  return ApiResponses.ok({ ok: true });
}, "[LiveAssistProxy]");
