import { withErrorHandler, ApiResponses, type RouteContext } from "@/lib/utils/ApiResponses";
import { BACKEND_URL } from "@/lib/config/urls";

export const POST = withErrorHandler(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const body = await request.json();
  const r = await fetch(`${BACKEND_URL}/api/live-assist/suggestions/${id}/apply`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) {
    // The backend error body may not be JSON (e.g. an HTML 500 page); read it
    // defensively so a non-JSON body doesn't turn a clean 4xx into an opaque 500.
    const text = await r.text();
    let message = "apply failed";
    try { message = JSON.parse(text)?.error ?? message; } catch { if (text) message = text; }
    return ApiResponses.unprocessable(message);
  }
  return ApiResponses.ok({ ok: true });
}, "[LiveAssistProxy]");
