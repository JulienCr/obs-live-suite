import {
  midiSettingsSchema,
  midiMessageSchema,
  midiAppSchema,
  MIDI_ACTIONS,
  MIDI_TRIGGER_CHANNELS,
  WH_EVENT_TO_ACTION,
  DEFAULT_MIDI_APPS,
  DEFAULT_MIDI_ACTIONS,
  getMessagesForAction,
  getPortForApp,
  getActionOffsetMs,
  actionSupportsOffset,
  midiActionConfigSchema,
  midiCcSendSchema,
  MIDI_CC_CHANNEL,
  MIDI_CC_EVENT,
  type MidiSettings,
} from "../../lib/models/Midi";
import { WordHarvestEventType } from "../../lib/models/WordHarvest";

describe("midiAppSchema", () => {
  it("defaults label and port to empty string", () => {
    const app = midiAppSchema.parse({ id: "x" });
    expect(app).toEqual({ id: "x", label: "", port: "" });
  });
});

describe("midiMessageSchema", () => {
  it("applies sensible defaults (CC 81 / value 127 / channel 1)", () => {
    const msg = midiMessageSchema.parse({ appId: "qlc" });
    expect(msg).toEqual({
      appId: "qlc",
      type: "cc",
      channel: 1,
      cc: 81,
      value: 127,
      enabled: true,
    });
  });

  it.each([
    ["channel", { channel: 0 }],
    ["channel", { channel: 17 }],
    ["cc", { cc: -1 }],
    ["cc", { cc: 128 }],
    ["value", { value: 128 }],
  ])("rejects out-of-range %s", (_field, patch) => {
    expect(() => midiMessageSchema.parse({ appId: "qlc", ...patch })).toThrow();
  });

  it("only accepts the 'cc' message type", () => {
    expect(() => midiMessageSchema.parse({ appId: "qlc", type: "note" })).toThrow();
  });
});

describe("midiSettingsSchema", () => {
  it("seeds default apps and actions when empty", () => {
    const settings = midiSettingsSchema.parse({});
    expect(settings.apps).toEqual(DEFAULT_MIDI_APPS);
    expect(settings.actions).toEqual(DEFAULT_MIDI_ACTIONS);
  });

  it("preserves explicitly provided empty arrays", () => {
    const settings = midiSettingsSchema.parse({ apps: [], actions: [] });
    expect(settings.apps).toEqual([]);
    expect(settings.actions).toEqual([]);
  });
});

describe("action catalog", () => {
  it("exposes the title reveal ON/OFF actions", () => {
    const ids = MIDI_ACTIONS.map((a) => a.id);
    expect(ids).toContain("title-reveal.on");
    expect(ids).toContain("title-reveal.off");
  });

  it("subscribes only to the distinct trigger channels", () => {
    expect([...MIDI_TRIGGER_CHANNELS].sort()).toEqual(["title-reveal", "word-harvest"]);
  });

  it("maps Word Harvest events to their action ids", () => {
    expect(WH_EVENT_TO_ACTION[WordHarvestEventType.WORD_APPROVED]).toBe("wordApproved");
    expect(WH_EVENT_TO_ACTION[WordHarvestEventType.WORD_USED]).toBe("wordUsed");
    expect(WH_EVENT_TO_ACTION[WordHarvestEventType.CELEBRATION]).toBe("celebration");
    expect(WH_EVENT_TO_ACTION[WordHarvestEventType.START_PERFORMING]).toBe("improStart");
  });

  it("seeds the FACE toggle: both ON and OFF send CC 81 to QLC+", () => {
    const def = midiSettingsSchema.parse({});
    for (const id of ["title-reveal.on", "title-reveal.off"]) {
      const [msg] = getMessagesForAction(def, id);
      expect(msg).toMatchObject({ appId: "qlc", cc: 81, value: 127, enabled: true });
    }
  });
});

describe("lookup helpers", () => {
  const settings: MidiSettings = {
    apps: [
      { id: "qlc", label: "QLC+", port: "qlc-in" },
      { id: "vm", label: "VoiceMeeter", port: "" },
    ],
    actions: [
      {
        id: "title-reveal.on",
        offsetMs: -500,
        messages: [{ appId: "qlc", type: "cc", channel: 1, cc: 81, value: 127, enabled: true }],
      },
    ],
  };

  it("returns the messages configured for an action", () => {
    expect(getMessagesForAction(settings, "title-reveal.on")).toHaveLength(1);
  });

  it("returns an empty list for an unknown action", () => {
    expect(getMessagesForAction(settings, "does-not-exist")).toEqual([]);
  });

  it("resolves an app's port, returning null for unknown apps", () => {
    expect(getPortForApp(settings, "qlc")).toBe("qlc-in");
    expect(getPortForApp(settings, "vm")).toBe(""); // known app, "" = first available
    expect(getPortForApp(settings, "missing")).toBeNull();
  });

  it("returns the configured action offset, 0 when unset", () => {
    expect(getActionOffsetMs(settings, "title-reveal.on")).toBe(-500);
    expect(getActionOffsetMs(settings, "missing")).toBe(0);
  });
});

describe("midiCcSendSchema (direct CC send)", () => {
  it("requires bus and note; defaults value/channel/duration", () => {
    const p = midiCcSendSchema.parse({ bus: "qlc-in", note: 81 });
    expect(p).toEqual({ bus: "qlc-in", note: 81, value: 127, channel: 1, duration: 0 });
  });

  it("keeps an explicit value and duration (seconds)", () => {
    const p = midiCcSendSchema.parse({ bus: "qlc-in", note: 81, value: 64, duration: 2.5 });
    expect(p).toMatchObject({ value: 64, duration: 2.5 });
  });

  it.each([
    ["empty bus", { bus: "", note: 81 }],
    ["missing bus", { note: 81 }],
    ["missing note", { bus: "qlc-in" }],
    ["note too high", { bus: "qlc-in", note: 128 }],
    ["note negative", { bus: "qlc-in", note: -1 }],
    ["value too high", { bus: "qlc-in", note: 81, value: 128 }],
    ["channel 0", { bus: "qlc-in", note: 81, channel: 0 }],
    ["channel 17", { bus: "qlc-in", note: 81, channel: 17 }],
    ["negative duration", { bus: "qlc-in", note: 81, duration: -1 }],
  ])("rejects %s", (_label, body) => {
    expect(() => midiCcSendSchema.parse(body)).toThrow();
  });

  it("exposes the MIDI channel + event constants for the dispatcher", () => {
    expect(MIDI_CC_CHANNEL).toBe("midi");
    expect(MIDI_CC_EVENT).toBe("cc");
  });

  it("keeps the direct CC channel out of the action trigger channels", () => {
    expect(MIDI_TRIGGER_CHANNELS).not.toContain(MIDI_CC_CHANNEL);
  });
});

describe("action offset", () => {
  it("defaults offsetMs to 0", () => {
    expect(midiActionConfigSchema.parse({ id: "x" }).offsetMs).toBe(0);
  });

  it("accepts a negative integer offset", () => {
    expect(midiActionConfigSchema.parse({ id: "x", offsetMs: -750 }).offsetMs).toBe(-750);
  });

  it("is exposed only for end-relative actions (title-reveal.off)", () => {
    const byId = Object.fromEntries(MIDI_ACTIONS.map((a) => [a.id, a]));
    expect(actionSupportsOffset(byId["title-reveal.off"])).toBe(true);
    expect(actionSupportsOffset(byId["title-reveal.on"])).toBe(false);
    expect(actionSupportsOffset(byId["wordApproved"])).toBe(false);
  });
});
