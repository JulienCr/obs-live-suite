import { z } from "zod";
import {
  StudioReturnSettingsSchema,
  MonitorInfoSchema,
  DEFAULT_STUDIO_RETURN_SETTINGS,
  COUNTDOWN_ZERO_DISMISS_MS,
} from "@/lib/models/StudioReturn";

describe("StudioReturnSettingsSchema", () => {
  it("applies correct defaults when parsing empty object", () => {
    const result = StudioReturnSettingsSchema.parse({});
    expect(result).toEqual({
      monitorIndex: 0,
      displayDuration: 10,
      fontSize: 80,
      enabled: true,
    });
  });

  it("accepts valid partial input", () => {
    const result = StudioReturnSettingsSchema.parse({ fontSize: 120 });
    expect(result.fontSize).toBe(120);
    expect(result.monitorIndex).toBe(0); // default
  });

  it("rejects monitorIndex below 0", () => {
    expect(() => StudioReturnSettingsSchema.parse({ monitorIndex: -1 })).toThrow();
  });

  it("rejects non-integer monitorIndex", () => {
    expect(() => StudioReturnSettingsSchema.parse({ monitorIndex: 0.5 })).toThrow();
  });

  it("rejects displayDuration below 3", () => {
    expect(() => StudioReturnSettingsSchema.parse({ displayDuration: 2 })).toThrow();
  });

  it("rejects displayDuration above 60", () => {
    expect(() => StudioReturnSettingsSchema.parse({ displayDuration: 61 })).toThrow();
  });

  it("rejects fontSize below 32", () => {
    expect(() => StudioReturnSettingsSchema.parse({ fontSize: 31 })).toThrow();
  });

  it("rejects fontSize above 160", () => {
    expect(() => StudioReturnSettingsSchema.parse({ fontSize: 161 })).toThrow();
  });

  it("accepts boundary values", () => {
    const result = StudioReturnSettingsSchema.parse({
      displayDuration: 3,
      fontSize: 32,
      monitorIndex: 0,
    });
    expect(result.displayDuration).toBe(3);
    expect(result.fontSize).toBe(32);

    const upper = StudioReturnSettingsSchema.parse({
      displayDuration: 60,
      fontSize: 160,
    });
    expect(upper.displayDuration).toBe(60);
    expect(upper.fontSize).toBe(160);
  });
});

describe("MonitorInfoSchema", () => {
  const validMonitor = {
    index: 0,
    name: "Samsung Odyssey G9",
    width: 5120,
    height: 1440,
    x: 0,
    y: 0,
    isPrimary: true,
  };

  it("accepts valid monitor info", () => {
    const result = MonitorInfoSchema.parse(validMonitor);
    expect(result).toEqual(validMonitor);
  });

  it("rejects negative index", () => {
    expect(() => MonitorInfoSchema.parse({ ...validMonitor, index: -1 })).toThrow();
  });

  it("rejects non-integer index", () => {
    expect(() => MonitorInfoSchema.parse({ ...validMonitor, index: 0.5 })).toThrow();
  });

  it("rejects zero or negative width/height", () => {
    expect(() => MonitorInfoSchema.parse({ ...validMonitor, width: 0 })).toThrow();
    expect(() => MonitorInfoSchema.parse({ ...validMonitor, height: -1 })).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => MonitorInfoSchema.parse({ index: 0 })).toThrow();
  });

  it("validates array of monitors", () => {
    const monitors = [
      validMonitor,
      { ...validMonitor, index: 1, isPrimary: false, x: 5120 },
    ];
    const result = z.array(MonitorInfoSchema).parse(monitors);
    expect(result).toHaveLength(2);
  });

  it("rejects array with invalid item", () => {
    const monitors = [validMonitor, { index: "invalid" }];
    expect(() => z.array(MonitorInfoSchema).parse(monitors)).toThrow();
  });
});

describe("DEFAULT_STUDIO_RETURN_SETTINGS", () => {
  it("matches schema defaults", () => {
    expect(DEFAULT_STUDIO_RETURN_SETTINGS).toEqual(StudioReturnSettingsSchema.parse({}));
  });
});

describe("COUNTDOWN_ZERO_DISMISS_MS", () => {
  it("is 3000ms", () => {
    expect(COUNTDOWN_ZERO_DISMISS_MS).toBe(3000);
  });
});
