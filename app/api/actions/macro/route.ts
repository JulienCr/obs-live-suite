import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Macro]";

/**
 * POST /api/actions/macro
 * Execute a macro (Stream Deck compatible)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { macroId } = body;

  if (!macroId) {
    return ApiResponses.badRequest("macroId is required");
  }

  // TODO: Implement macro execution via MacroEngine
  console.log(`${LOG_CONTEXT} Execute macro:`, macroId);

  return ApiResponses.ok({ success: true, macroId });
}, LOG_CONTEXT);

