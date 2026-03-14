import { buildCuePayload } from "@/lib/utils/cueClient";
import { CueType, CueSeverity, CueFrom } from "@/lib/models/Cue";

describe("buildCuePayload", () => {
  it("builds a basic cue payload with required fields", () => {
    const result = buildCuePayload({ type: CueType.CUE });
    expect(result.type).toBe(CueType.CUE);
    expect(result.from).toBe(CueFrom.CONTROL);
    expect(result.pinned).toBe(false);
    expect(result.body).toBeUndefined();
    expect(result.title).toBeUndefined();
  });

  it("includes severity only for CUE type", () => {
    const cue = buildCuePayload({ type: CueType.CUE, severity: CueSeverity.URGENT });
    expect(cue.severity).toBe(CueSeverity.URGENT);

    const countdown = buildCuePayload({ type: CueType.COUNTDOWN, severity: CueSeverity.URGENT });
    expect(countdown.severity).toBeUndefined();

    const note = buildCuePayload({ type: CueType.NOTE, severity: CueSeverity.INFO });
    expect(note.severity).toBeUndefined();
  });

  it("includes countdownPayload only for COUNTDOWN type", () => {
    const countdown = buildCuePayload({ type: CueType.COUNTDOWN });
    expect(countdown.countdownPayload).toEqual({
      mode: "duration",
      durationSec: 60,
    });

    const cue = buildCuePayload({ type: CueType.CUE });
    expect(cue.countdownPayload).toBeUndefined();
  });

  it("uses custom countdown seconds", () => {
    const result = buildCuePayload({ type: CueType.COUNTDOWN, countdownSeconds: 30 });
    expect(result.countdownPayload?.durationSec).toBe(30);
  });

  it("trims title and body", () => {
    const result = buildCuePayload({
      type: CueType.CUE,
      title: "  Hello  ",
      body: "  World  ",
    });
    expect(result.title).toBe("Hello");
    expect(result.body).toBe("World");
  });

  it("converts whitespace-only body and title to undefined", () => {
    const result = buildCuePayload({
      type: CueType.CUE,
      title: "   ",
      body: "   ",
    });
    expect(result.title).toBeUndefined();
    expect(result.body).toBeUndefined();
  });

  it("respects pinned option", () => {
    const pinned = buildCuePayload({ type: CueType.CUE, pinned: true });
    expect(pinned.pinned).toBe(true);

    const unpinned = buildCuePayload({ type: CueType.CUE, pinned: false });
    expect(unpinned.pinned).toBe(false);
  });

  it("defaults pinned to false when not specified", () => {
    const result = buildCuePayload({ type: CueType.CUE });
    expect(result.pinned).toBe(false);
  });
});
