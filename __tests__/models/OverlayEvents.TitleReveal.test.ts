import {
  titleRevealPlayPayloadSchema,
  isTitleRevealEvent,
  TitleRevealEventType,
} from "@/lib/models/OverlayEvents";

describe("OverlayEvents - Title Reveal", () => {
  describe("titleRevealPlayPayloadSchema", () => {
    const validPayload = {
      lines: [{ text: "Hello World" }],
      fontFamily: "Permanent Marker",
      fontSize: 80,
      rotation: -5,
      colorText: "#F5A623",
      colorGhostBlue: "#7B8DB5",
      colorGhostNavy: "#1B2A6B",
      duration: 8.5,
    };

    it("should validate a payload with all fields", () => {
      const result = titleRevealPlayPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lines).toHaveLength(1);
        expect(result.data.fontFamily).toBe("Permanent Marker");
        expect(result.data.fontSize).toBe(80);
        expect(result.data.rotation).toBe(-5);
        expect(result.data.colorText).toBe("#F5A623");
        expect(result.data.duration).toBe(8.5);
      }
    });

    it("should validate minimal payload with defaults applied", () => {
      const minimal = {
        lines: [{ text: "Minimal" }],
      };
      const result = titleRevealPlayPayloadSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fontFamily).toBe("Permanent Marker");
        expect(result.data.fontSize).toBe(80);
        expect(result.data.rotation).toBe(-5);
        expect(result.data.colorText).toBe("#F5A623");
        expect(result.data.colorGhostBlue).toBe("#7B8DB5");
        expect(result.data.colorGhostNavy).toBe("#1B2A6B");
        expect(result.data.duration).toBe(8.5);
      }
    });

    it("should reject empty lines array", () => {
      const result = titleRevealPlayPayloadSchema.safeParse({
        ...validPayload,
        lines: [],
      });
      expect(result.success).toBe(false);
    });

    it("should accept null logoUrl", () => {
      const result = titleRevealPlayPayloadSchema.safeParse({
        ...validPayload,
        logoUrl: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logoUrl).toBeNull();
      }
    });

    it("should accept optional id and name fields", () => {
      const result = titleRevealPlayPayloadSchema.safeParse({
        ...validPayload,
        id: "some-id",
        name: "Episode 1",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("some-id");
        expect(result.data.name).toBe("Episode 1");
      }
    });

    it("should apply line defaults (fontSize, alignment, offsets)", () => {
      const result = titleRevealPlayPayloadSchema.safeParse({
        lines: [{ text: "Defaults" }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const line = result.data.lines[0];
        expect(line.fontSize).toBe(80);
        expect(line.alignment).toBe("l");
        expect(line.offsetX).toBe(0);
        expect(line.offsetY).toBe(0);
      }
    });
  });

  describe("isTitleRevealEvent", () => {
    it('should return true for { type: "play" }', () => {
      expect(isTitleRevealEvent({ type: "play" })).toBe(true);
    });

    it('should return true for { type: "hide" }', () => {
      expect(isTitleRevealEvent({ type: "hide" })).toBe(true);
    });

    it('should return false for { type: "show" }', () => {
      expect(isTitleRevealEvent({ type: "show" })).toBe(false);
    });

    it('should return false for { type: "update" }', () => {
      expect(isTitleRevealEvent({ type: "update" })).toBe(false);
    });

    it('should return false for { type: "set" }', () => {
      expect(isTitleRevealEvent({ type: "set" })).toBe(false);
    });
  });

  describe("TitleRevealEventType enum", () => {
    it("should have PLAY and HIDE values", () => {
      expect(TitleRevealEventType.PLAY).toBe("play");
      expect(TitleRevealEventType.HIDE).toBe("hide");
    });
  });
});
