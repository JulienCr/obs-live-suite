import { CueType, CueSeverity, CueFrom } from "@/lib/models/Cue";
import { apiPost } from "@/lib/utils/ClientFetch";

export interface CuePayloadOptions {
  type: CueType;
  severity?: CueSeverity;
  title?: string;
  body?: string;
  pinned?: boolean;
  countdownSeconds?: number;
}

/**
 * Build a cue payload from structured options.
 * Shared between CueComposerPanel and RegieInternalChatPanel.
 */
export function buildCuePayload(opts: CuePayloadOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: opts.type,
    from: CueFrom.CONTROL,
    body: opts.body?.trim() || undefined,
    pinned: opts.pinned ?? false,
  };

  if (opts.title?.trim()) {
    payload.title = opts.title.trim();
  }

  if (opts.type === CueType.CUE && opts.severity) {
    payload.severity = opts.severity;
  }

  if (opts.type === CueType.COUNTDOWN) {
    payload.countdownPayload = {
      mode: "duration",
      durationSec: opts.countdownSeconds ?? 60,
    };
  }

  return payload;
}

/**
 * Send a cue message to the presenter system.
 * @param payload - The cue payload (from buildCuePayload)
 * @param studioReturn - Whether to also display on studio return overlay
 */
export async function sendCue(
  payload: Record<string, unknown>,
  studioReturn = false,
): Promise<void> {
  await apiPost("/api/presenter/cue/send", { ...payload, studioReturn });
}

/**
 * Dismiss the studio return overlay.
 */
export async function dismissStudioReturn(): Promise<void> {
  await apiPost("/api/presenter/cue/send", {
    type: CueType.CUE,
    from: CueFrom.CONTROL,
    body: "",
    studioReturn: true,
    studioReturnDismiss: true,
  });
}
