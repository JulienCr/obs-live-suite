import {
  titleLineSchema,
  titleRevealConfigSchema,
  createTitleRevealSchema,
  updateTitleRevealSchema,
} from "@/lib/models/TitleReveal";
import { randomUUID } from "crypto";

describe("TitleReveal Model", () => {
  const validLine = {
    text: "Hello World",
    fontSize: 120,
    alignment: "c" as const,
    offsetX: 50,
    offsetY: -20,
  };

  const validConfig = {
    id: randomUUID(),
    name: "Episode Title",
    lines: [validLine],
    logoUrl: "https://example.com/logo.png",
    fontFamily: "Permanent Marker",
    fontSize: 80,
    rotation: -5,
    colorText: "#F5A623",
    colorGhostBlue: "#7B8DB5",
    colorGhostNavy: "#1B2A6B",
    duration: 8.5,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("titleLineSchema", () => {
    it("should validate a line with all fields", () => {
      const result = titleLineSchema.safeParse(validLine);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.text).toBe("Hello World");
        expect(result.data.fontSize).toBe(120);
        expect(result.data.alignment).toBe("c");
        expect(result.data.offsetX).toBe(50);
        expect(result.data.offsetY).toBe(-20);
      }
    });

    it("should validate a minimal line with defaults applied", () => {
      const result = titleLineSchema.safeParse({ text: "Minimal" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.text).toBe("Minimal");
        expect(result.data.fontSize).toBe(80);
        expect(result.data.alignment).toBe("l");
        expect(result.data.offsetX).toBe(0);
        expect(result.data.offsetY).toBe(0);
      }
    });

    it("should reject empty text", () => {
      const result = titleLineSchema.safeParse({ text: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const textError = result.error.issues.find((i) =>
          i.path.includes("text")
        );
        expect(textError).toBeDefined();
      }
    });

    it("should reject non-positive fontSize", () => {
      const result = titleLineSchema.safeParse({ text: "Test", fontSize: 0 });
      expect(result.success).toBe(false);
    });

    it("should reject negative fontSize", () => {
      const result = titleLineSchema.safeParse({ text: "Test", fontSize: -10 });
      expect(result.success).toBe(false);
    });

    it("should reject invalid alignment values", () => {
      const result = titleLineSchema.safeParse({
        text: "Test",
        alignment: "center",
      });
      expect(result.success).toBe(false);
    });

    it.each(["l", "c", "r"] as const)(
      'should accept alignment="%s"',
      (alignment) => {
        const result = titleLineSchema.safeParse({ text: "Test", alignment });
        expect(result.success).toBe(true);
      }
    );

    it("should accept negative offsets", () => {
      const result = titleLineSchema.safeParse({
        text: "Test",
        offsetX: -100,
        offsetY: -50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offsetX).toBe(-100);
        expect(result.data.offsetY).toBe(-50);
      }
    });
  });

  describe("titleRevealConfigSchema", () => {
    it("should validate a config with all fields", () => {
      const result = titleRevealConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validConfig.id);
        expect(result.data.name).toBe("Episode Title");
        expect(result.data.lines).toHaveLength(1);
        expect(result.data.logoUrl).toBe("https://example.com/logo.png");
        expect(result.data.fontFamily).toBe("Permanent Marker");
        expect(result.data.duration).toBe(8.5);
      }
    });

    it("should validate minimal config with defaults", () => {
      const minimal = {
        id: randomUUID(),
        name: "Minimal",
        lines: [{ text: "Line 1" }],
      };
      const result = titleRevealConfigSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fontFamily).toBe("Permanent Marker");
        expect(result.data.fontSize).toBe(80);
        expect(result.data.rotation).toBe(-5);
        expect(result.data.colorText).toBe("#F5A623");
        expect(result.data.colorGhostBlue).toBe("#7B8DB5");
        expect(result.data.colorGhostNavy).toBe("#1B2A6B");
        expect(result.data.duration).toBe(8.5);
        expect(result.data.sortOrder).toBe(0);
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should reject invalid UUID", () => {
      const result = titleRevealConfigSchema.safeParse({
        ...validConfig,
        id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const result = titleRevealConfigSchema.safeParse({
        ...validConfig,
        name: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.issues.find((i) =>
          i.path.includes("name")
        );
        expect(nameError).toBeDefined();
      }
    });

    it("should reject name exceeding 200 characters", () => {
      const result = titleRevealConfigSchema.safeParse({
        ...validConfig,
        name: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("should accept name at exactly 200 characters", () => {
      const result = titleRevealConfigSchema.safeParse({
        ...validConfig,
        name: "a".repeat(200),
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty lines array", () => {
      const result = titleRevealConfigSchema.safeParse({
        ...validConfig,
        lines: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-positive duration", () => {
      const result = titleRevealConfigSchema.safeParse({
        ...validConfig,
        duration: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative duration", () => {
      const result = titleRevealConfigSchema.safeParse({
        ...validConfig,
        duration: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should accept null logoUrl", () => {
      const result = titleRevealConfigSchema.safeParse({
        ...validConfig,
        logoUrl: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logoUrl).toBeNull();
      }
    });

    it("should default logoUrl to null when omitted", () => {
      const { logoUrl: _url, ...withoutLogo } = validConfig;
      const result = titleRevealConfigSchema.safeParse(withoutLogo);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logoUrl).toBeNull();
      }
    });

    it("should accept zero rotation", () => {
      const result = titleRevealConfigSchema.safeParse({
        ...validConfig,
        rotation: 0,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rotation).toBe(0);
      }
    });
  });

  describe("createTitleRevealSchema", () => {
    it("should validate creation input without id and timestamps", () => {
      const createData = {
        name: "New Title",
        lines: [{ text: "Line 1" }],
      };
      const result = createTitleRevealSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });

    it("should strip id field (omitted from schema)", () => {
      const createData = {
        id: randomUUID(),
        name: "With ID",
        lines: [{ text: "Line 1" }],
      };
      const result = createTitleRevealSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).id).toBeUndefined();
      }
    });

    it("should strip createdAt and updatedAt fields", () => {
      const createData = {
        name: "With timestamps",
        lines: [{ text: "Line 1" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = createTitleRevealSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(
          (result.data as Record<string, unknown>).createdAt
        ).toBeUndefined();
        expect(
          (result.data as Record<string, unknown>).updatedAt
        ).toBeUndefined();
      }
    });

    it("should require name and lines", () => {
      const result = createTitleRevealSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updateTitleRevealSchema", () => {
    it("should require id", () => {
      const result = updateTitleRevealSchema.safeParse({
        name: "No ID",
      });
      expect(result.success).toBe(false);
    });

    it("should validate update with only id", () => {
      const result = updateTitleRevealSchema.safeParse({
        id: randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("should validate partial update with only name", () => {
      const result = updateTitleRevealSchema.safeParse({
        id: randomUUID(),
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Name");
        expect(result.data.lines).toBeUndefined();
        expect(result.data.duration).toBeUndefined();
      }
    });

    it("should reject invalid id (non-uuid)", () => {
      const result = updateTitleRevealSchema.safeParse({
        id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should still enforce name max length when provided", () => {
      const result = updateTitleRevealSchema.safeParse({
        id: randomUUID(),
        name: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });
});
