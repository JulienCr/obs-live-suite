import { getEffectivePosterDuration } from "@/components/dashboard/cards/posterDurationHelpers";

describe("getEffectivePosterDuration", () => {
  it("returns the live playback duration when it is a valid positive finite number", () => {
    const result = getEffectivePosterDuration({
      playbackDuration: 123,
      posterDuration: 999,
      clipStart: 0,
      clipEnd: 0,
    });
    expect(result).toBe(123);
  });

  it("falls back to the DB-stored poster duration when live duration is 0 (webm without metadata)", () => {
    const result = getEffectivePosterDuration({
      playbackDuration: 0,
      posterDuration: 420,
      clipStart: 0,
      clipEnd: 0,
    });
    expect(result).toBe(420);
  });

  it("falls back to the DB-stored poster duration when live duration is Infinity (webm)", () => {
    const result = getEffectivePosterDuration({
      playbackDuration: Infinity,
      posterDuration: 600,
      clipStart: 0,
      clipEnd: 0,
    });
    expect(result).toBe(600);
  });

  it("falls back to the DB-stored poster duration when live duration is NaN", () => {
    const result = getEffectivePosterDuration({
      playbackDuration: NaN,
      posterDuration: 300,
      clipStart: 0,
      clipEnd: 0,
    });
    expect(result).toBe(300);
  });

  it("returns 0 when both live duration and DB duration are unavailable", () => {
    const result = getEffectivePosterDuration({
      playbackDuration: 0,
      posterDuration: null,
      clipStart: 0,
      clipEnd: 0,
    });
    expect(result).toBe(0);
  });

  it("returns 0 when poster duration is undefined and live duration is missing", () => {
    const result = getEffectivePosterDuration({
      playbackDuration: 0,
      posterDuration: undefined,
      clipStart: 0,
      clipEnd: 0,
    });
    expect(result).toBe(0);
  });

  it("uses clipEnd - clipStart when a sub-clip is configured (hasSubClip true)", () => {
    // Sub-clip overrides both live and DB durations
    const result = getEffectivePosterDuration({
      playbackDuration: 500,
      posterDuration: 999,
      clipStart: 10,
      clipEnd: 60,
    });
    expect(result).toBe(50);
  });

  it("treats clipStart > 0 alone as a sub-clip but requires clipEnd > 0 to compute length", () => {
    // hasSubClip is true when clipStart > 0 OR clipEnd > 0; when clipEnd is 0
    // we should still fall back to live/DB duration rather than reporting a negative value.
    const result = getEffectivePosterDuration({
      playbackDuration: 0,
      posterDuration: 250,
      clipStart: 5,
      clipEnd: 0,
    });
    expect(result).toBe(250);
  });
});
