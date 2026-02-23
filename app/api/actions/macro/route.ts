import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";
import { MacroRepository } from "@/lib/repositories/MacroRepository";
import { MacroEngine } from "@/lib/services/MacroEngine";
import { macroSchema } from "@/lib/models/Macro";

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

  const dbMacro = MacroRepository.getInstance().getById(macroId);
  if (!dbMacro) {
    return ApiResponses.notFound("Macro");
  }

  // Parse DB record into validated Macro type (converts null → undefined for optional fields)
  const macro = macroSchema.parse({
    ...dbMacro,
    description: dbMacro.description ?? undefined,
    hotkey: dbMacro.hotkey ?? undefined,
    profileId: dbMacro.profileId ?? undefined,
  });

  const engine = MacroEngine.getInstance();
  if (engine.getIsExecuting()) {
    return ApiResponses.conflict("Another macro is already executing");
  }

  await engine.execute(macro);

  return ApiResponses.ok({ success: true, macroId });
}, LOG_CONTEXT);
