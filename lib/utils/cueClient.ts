import { CueType, CueSeverity, CueFrom } from "@/lib/models/Cue";
import type { CountdownPayload } from "@/lib/models/Cue";
import { apiPost } from "@/lib/utils/ClientFetch";

export interface CuePayloadOptions {
  type: CueType;
  severity?: CueSeverity;
  title?: string;
  body?: string;
  pinned?: boolean;
  countdownSeconds?: number;
}

/** Shape of the payload sent to /api/presenter/cue/send */
export interface CueSendPayload {
  type: CueType;
  from: CueFrom;
  body?: string;
  title?: string;
  pinned: boolean;
  severity?: CueSeverity;
  countdownPayload?: CountdownPayload;
  studioReturn?: boolean;
  studioReturnDismiss?: boolean;
}

/**
 * Build a cue payload from structured options.
 * Shared between CueComposerPanel and RegieInternalChatPanel.
 */
export function buildCuePayload(opts: CuePayloadOptions): CueSendPayload {
  const payload: CueSendPayload = {
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
  payload: CueSendPayload,
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
    pinned: false,
    studioReturn: true,
    studioReturnDismiss: true,
  } satisfies CueSendPayload);
}
