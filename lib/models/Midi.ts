import { z } from "zod";
import { WordHarvestEventType } from "./WordHarvest";

// =============================================================================
// Centralized MIDI configuration (shared between client & server)
//
// Model:
//  - A MIDI "application" is a named target bound to a MIDI output port.
//  - An "action" (e.g. title-reveal ON/OFF) maps to one or more messages.
//  - Each message targets an application + a MIDI message (CC for now).
//
// MIDI is sent from the browser via the Web MIDI API (see hooks/useMidi.ts).
// The action catalog (MIDI_ACTIONS) is the single source of truth: adding a
// new triggerable action is a one-line change here (+ i18n).
// =============================================================================

/** A MIDI application = a human label bound to a MIDI output port. */
export const midiAppSchema = z.object({
  /** Stable identifier referenced by messages (slug or uuid). */
  id: z.string(),
  /** Human-readable label, e.g. "QLC+", "VoiceMeeter", "Avocam". */
  label: z.string().default(""),
  /** MIDI output name; "" means "first available output". */
  port: z.string().default(""),
});

export type MidiApp = z.infer<typeof midiAppSchema>;

/** A single MIDI message sent when an action fires. */
export const midiMessageSchema = z.object({
  /** References a MidiApp.id. */
  appId: z.string().default(""),
  /** Message kind. Only "cc" today; reserved for future Note On/Off support. */
  type: z.literal("cc").default("cc"),
  channel: z.number().int().min(1).max(16).default(1),
  cc: z.number().int().min(0).max(127).default(81),
  value: z.number().int().min(0).max(127).default(127),
  enabled: z.boolean().default(true),
});

export type MidiMessage = z.infer<typeof midiMessageSchema>;

/** Per-action configuration: the list of messages to send. */
export const midiActionConfigSchema = z.object({
  /** Action id from MIDI_ACTIONS. */
  id: z.string(),
  /**
   * Timing offset (ms) applied to this action's natural trigger; negative fires
   * earlier. Currently honoured for `title-reveal.off`, where the OFF is timed
   * from the jingle's end — a negative offset relights the FACE slightly before
   * the visual end (and absorbs the QLC fade + WS→MIDI latency).
   */
  offsetMs: z.number().int().default(0),
  messages: z.array(midiMessageSchema).default([]),
});

export type MidiActionConfig = z.infer<typeof midiActionConfigSchema>;

// -----------------------------------------------------------------------------
// Action catalog (code-defined, single source of truth)
// -----------------------------------------------------------------------------

/** A trigger describes which WebSocket event fires an action. */
export type MidiActionTrigger =
  | { channel: "title-reveal"; on: "play" }
  /** Fires at the natural end of the title reveal (timer) or on manual hide. */
  | { channel: "title-reveal"; on: "play-end" }
  | { channel: "word-harvest"; on: WordHarvestEventType };

export type MidiActionGroup = "titleReveal" | "wordHarvest";

export interface MidiActionDef {
  /** Stable action id stored in config + referenced by the dispatcher. */
  id: string;
  /** i18n key under "midi.actions". */
  labelKey: string;
  /** UI grouping. */
  group: MidiActionGroup;
  trigger: MidiActionTrigger;
}

export const MIDI_ACTIONS: MidiActionDef[] = [
  {
    id: "title-reveal.on",
    labelKey: "titleRevealOn",
    group: "titleReveal",
    trigger: { channel: "title-reveal", on: "play" },
  },
  {
    id: "title-reveal.off",
    labelKey: "titleRevealOff",
    group: "titleReveal",
    trigger: { channel: "title-reveal", on: "play-end" },
  },
  {
    id: "wordApproved",
    labelKey: "wordApproved",
    group: "wordHarvest",
    trigger: { channel: "word-harvest", on: WordHarvestEventType.WORD_APPROVED },
  },
  {
    id: "wordUsed",
    labelKey: "wordUsed",
    group: "wordHarvest",
    trigger: { channel: "word-harvest", on: WordHarvestEventType.WORD_USED },
  },
  {
    id: "celebration",
    labelKey: "celebration",
    group: "wordHarvest",
    trigger: { channel: "word-harvest", on: WordHarvestEventType.CELEBRATION },
  },
  {
    id: "improStart",
    labelKey: "improStart",
    group: "wordHarvest",
    trigger: { channel: "word-harvest", on: WordHarvestEventType.START_PERFORMING },
  },
];

/** Distinct WebSocket channels the dispatcher must subscribe to. */
export const MIDI_TRIGGER_CHANNELS: string[] = Array.from(
  new Set(MIDI_ACTIONS.map((a) => a.trigger.channel))
);

/** Map a Word Harvest event type to its action id (for the dispatcher). */
export const WH_EVENT_TO_ACTION: Partial<Record<WordHarvestEventType, string>> =
  Object.fromEntries(
    MIDI_ACTIONS.filter((a) => a.trigger.channel === "word-harvest").map((a) => [
      (a.trigger as { on: WordHarvestEventType }).on,
      a.id,
    ])
  );

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------

/** Seeded applications with the operator's stated loopMIDI port names. */
export const DEFAULT_MIDI_APPS: MidiApp[] = [
  { id: "qlc", label: "QLC+", port: "qlc-in" },
  { id: "voicemeeter", label: "VoiceMeeter", port: "xtouch-gw" },
  { id: "avocam", label: "Avocam", port: "avocam-in" },
];

/**
 * Seeded actions. The FACE toggle: ON and OFF both send the same CC 81 to QLC+,
 * which toggles the FACE light (off during the jingle, back on at the end).
 */
export const DEFAULT_MIDI_ACTIONS: MidiActionConfig[] = [
  {
    id: "title-reveal.on",
    offsetMs: 0,
    messages: [{ appId: "qlc", type: "cc", channel: 1, cc: 81, value: 127, enabled: true }],
  },
  {
    id: "title-reveal.off",
    offsetMs: 0,
    messages: [{ appId: "qlc", type: "cc", channel: 1, cc: 81, value: 127, enabled: true }],
  },
];

/** Default title reveal duration (seconds) used to time the OFF when missing. */
export const DEFAULT_TITLE_REVEAL_DURATION = 8.5;

export const midiSettingsSchema = z.object({
  apps: z.array(midiAppSchema).default(DEFAULT_MIDI_APPS),
  actions: z.array(midiActionConfigSchema).default(DEFAULT_MIDI_ACTIONS),
});

export type MidiSettings = z.infer<typeof midiSettingsSchema>;

export const DEFAULT_MIDI_SETTINGS: MidiSettings = {
  apps: DEFAULT_MIDI_APPS,
  actions: DEFAULT_MIDI_ACTIONS,
};

// -----------------------------------------------------------------------------
// Lookup helpers (used by the dispatcher and the settings UI)
// -----------------------------------------------------------------------------

/** Messages configured for an action id (empty if none). */
export function getMessagesForAction(
  settings: MidiSettings,
  actionId: string
): MidiMessage[] {
  return settings.actions.find((a) => a.id === actionId)?.messages ?? [];
}

/** Configured timing offset (ms) for an action; 0 when unset. */
export function getActionOffsetMs(settings: MidiSettings, actionId: string): number {
  return settings.actions.find((a) => a.id === actionId)?.offsetMs ?? 0;
}

/**
 * Whether an action fires at the title reveal's end, so a timing offset is
 * meaningful and should be exposed in the settings UI.
 */
export function actionSupportsOffset(def: MidiActionDef): boolean {
  return def.trigger.channel === "title-reveal" && def.trigger.on === "play-end";
}

/**
 * MIDI output port for an app id. Returns the app's port ("" = first available
 * output), or `null` when no app matches the id. Callers MUST skip `null`
 * rather than treat it as "first available" — otherwise an orphaned message
 * (deleted/typo'd appId) would mis-send to whatever device happens to be first.
 */
export function getPortForApp(settings: MidiSettings, appId: string): string | null {
  const app = settings.apps.find((a) => a.id === appId);
  return app ? app.port : null;
}

// -----------------------------------------------------------------------------
// Direct CC send (POST /api/midi/cc)
//
// A one-shot CC send bypassing the action catalog: the caller names the output
// port (`bus`) and the CC directly. The backend route publishes the validated
// payload on the MIDI channel; the dispatcher (hooks/useMidiDispatcher.ts) turns
// it into a Web MIDI send. The single source of truth for the defaults below.
//
// MIDI is NOT an overlay, so it uses its own WS channel string (like the
// presenter / live-assist channels) rather than the OverlayChannel enum.
// -----------------------------------------------------------------------------

/** WebSocket channel carrying direct CC sends. */
export const MIDI_CC_CHANNEL = "midi";
/** Event type published on MIDI_CC_CHANNEL. */
export const MIDI_CC_EVENT = "cc";

export const midiCcSendSchema = z.object({
  /** MIDI output port name (e.g. "qlc-in"). Passed straight to sendCC. */
  bus: z.string().min(1),
  /** CC controller number (0-127), e.g. 81 for the FACE toggle. */
  note: z.number().int().min(0).max(127),
  /** CC value (0-127). */
  value: z.number().int().min(0).max(127).default(127),
  /** MIDI channel (1-16). */
  channel: z.number().int().min(1).max(16).default(1),
  /**
   * Seconds before the SAME message is re-sent once. 0 (or absent) = single
   * send; > 0 = a second identical send after `duration` seconds (e.g. to
   * toggle a light back). Capped at 3600s — large/Infinity/NaN values would
   * overflow setTimeout's 32-bit delay and fire the re-send almost immediately.
   */
  duration: z.number().min(0).max(3600).default(0),
});

export type MidiCcSend = z.infer<typeof midiCcSendSchema>;
