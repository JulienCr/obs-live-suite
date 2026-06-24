import { withErrorHandler, ApiResponses, type RouteContext } from "@/lib/utils/ApiResponses";
import { BACKEND_URL } from "@/lib/config/urls";

export const POST = withErrorHandler(async (_request: Request, context: RouteContext) => {
  const { id } = await context.params;
  await fetch(`${BACKEND_URL}/api/live-assist/suggestions/${id}/dismiss`, { method: "POST" });
  return ApiResponses.ok({ ok: true });
}, "[LiveAssistProxy]");
