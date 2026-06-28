import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[MidiAPI:CC]";

/**
 * POST /api/midi/cc
 * Proxy to the backend, which publishes the CC on the MIDI WebSocket channel for
 * the dashboard dispatcher to emit via Web MIDI.
 * Body: { bus, note, value?, channel?, duration? } (see midiCcSendSchema).
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return ApiResponses.badRequest("Invalid JSON body");
  }
  return proxyToBackend("/api/midi/cc", {
    method: "POST",
    body,
    errorMessage: "Failed to send MIDI CC",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);
