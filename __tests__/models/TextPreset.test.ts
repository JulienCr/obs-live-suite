import {
  textPresetSchema,
  createTextPresetSchema,
  updateTextPresetSchema,
} from "@/lib/models/TextPreset";
import { randomUUID } from "crypto";

describe("TextPreset Model", () => {
  const validPreset = {
    id: randomUUID(),
    name: "Welcome Message",
    body: "Welcome to the show!",
    side: "left" as const,
    imageUrl: "https://example.com/image.png",
    imageAlt: "Welcome banner",
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("textPresetSchema", () => {
    it("should validate a fully populated preset", () => {
      const result = textPresetSchema.safeParse(validPreset);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validPreset.id);
        expect(result.data.name).toBe("Welcome Message");
        expect(result.data.body).toBe("Welcome to the show!");
        expect(result.data.side).toBe("left");
        expect(result.data.imageUrl).toBe("https://example.com/image.png");
        expect(result.data.imageAlt).toBe("Welcome banner");
        expect(result.data.isEnabled).toBe(true);
      }
    });

    it("should validate a preset with minimal required fields and defaults", () => {
      const minimal = {
        id: randomUUID(),
        name: "Test",
        body: "Test body",
      };
      const result = textPresetSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.side).toBe("left");
        expect(result.data.imageUrl).toBeNull();
        expect(result.data.imageAlt).toBeNull();
        expect(result.data.isEnabled).toBe(true);
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should reject an invalid UUID for id", () => {
      const result = textPresetSchema.safeParse({
        ...validPreset,
        id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const result = textPresetSchema.safeParse({
        ...validPreset,
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

    it("should reject name exceeding 100 characters", () => {
      const result = textPresetSchema.safeParse({
        ...validPreset,
        name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should accept name at exactly 100 characters", () => {
      const result = textPresetSchema.safeParse({
        ...validPreset,
        name: "a".repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty body", () => {
      const result = textPresetSchema.safeParse({
        ...validPreset,
        body: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const bodyError = result.error.issues.find((i) =>
          i.path.includes("body")
        );
        expect(bodyError).toBeDefined();
      }
    });

    it("should reject body exceeding 2000 characters", () => {
      const result = textPresetSchema.safeParse({
        ...validPreset,
        body: "x".repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it("should accept body at exactly 2000 characters", () => {
      const result = textPresetSchema.safeParse({
        ...validPreset,
        body: "x".repeat(2000),
      });
      expect(result.success).toBe(true);
    });

    describe("side enum", () => {
      it.each(["left", "right", "center"] as const)(
        'should accept side="%s"',
        (side) => {
          const result = textPresetSchema.safeParse({
            ...validPreset,
            side,
          });
          expect(result.success).toBe(true);
        }
      );

      it("should reject invalid side value", () => {
        const result = textPresetSchema.safeParse({
          ...validPreset,
          side: "top",
        });
        expect(result.success).toBe(false);
      });

      it("should default side to left when omitted", () => {
        const { side: _side, ...withoutSide } = validPreset;
        const result = textPresetSchema.safeParse(withoutSide);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.side).toBe("left");
        }
      });
    });

    describe("imageUrl", () => {
      it("should accept null imageUrl", () => {
        const result = textPresetSchema.safeParse({
          ...validPreset,
          imageUrl: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.imageUrl).toBeNull();
        }
      });

      it("should default imageUrl to null when omitted", () => {
        const { imageUrl: _url, ...withoutUrl } = validPreset;
        const result = textPresetSchema.safeParse(withoutUrl);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.imageUrl).toBeNull();
        }
      });
    });

    describe("imageAlt", () => {
      it("should accept null imageAlt", () => {
        const result = textPresetSchema.safeParse({
          ...validPreset,
          imageAlt: null,
        });
        expect(result.success).toBe(true);
      });

      it("should reject imageAlt exceeding 200 characters", () => {
        const result = textPresetSchema.safeParse({
          ...validPreset,
          imageAlt: "a".repeat(201),
        });
        expect(result.success).toBe(false);
      });

      it("should accept imageAlt at exactly 200 characters", () => {
        const result = textPresetSchema.safeParse({
          ...validPreset,
          imageAlt: "a".repeat(200),
        });
        expect(result.success).toBe(true);
      });

      it("should default imageAlt to null when omitted", () => {
        const { imageAlt: _alt, ...withoutAlt } = validPreset;
        const result = textPresetSchema.safeParse(withoutAlt);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.imageAlt).toBeNull();
        }
      });
    });

    describe("isEnabled", () => {
      it("should accept false", () => {
        const result = textPresetSchema.safeParse({
          ...validPreset,
          isEnabled: false,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isEnabled).toBe(false);
        }
      });

      it("should default to true when omitted", () => {
        const { isEnabled: _enabled, ...withoutEnabled } = validPreset;
        const result = textPresetSchema.safeParse(withoutEnabled);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isEnabled).toBe(true);
        }
      });
    });

    it("should reject missing required fields", () => {
      const result = textPresetSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject non-string name", () => {
      const result = textPresetSchema.safeParse({
        ...validPreset,
        name: 42,
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-string body", () => {
      const result = textPresetSchema.safeParse({
        ...validPreset,
        body: 123,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createTextPresetSchema", () => {
    it("should validate a creation input without id and timestamps", () => {
      const createData = {
        name: "New Preset",
        body: "Preset body text",
        side: "center" as const,
      };
      const result = createTextPresetSchema.safeParse(createData);
      expect(result.success).toBe(true);
    });

    it("should validate minimal creation input with defaults", () => {
      const createData = {
        name: "Minimal",
        body: "Just body",
      };
      const result = createTextPresetSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.side).toBe("left");
        expect(result.data.imageUrl).toBeNull();
        expect(result.data.imageAlt).toBeNull();
        expect(result.data.isEnabled).toBe(true);
      }
    });

    it("should reject id field (it is omitted from the schema)", () => {
      const createData = {
        id: randomUUID(),
        name: "With ID",
        body: "Body",
      };
      const result = createTextPresetSchema.safeParse(createData);
      // Zod strips unknown keys by default, so id is simply removed
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).id).toBeUndefined();
      }
    });

    it("should reject createdAt field (it is omitted from the schema)", () => {
      const createData = {
        name: "With timestamp",
        body: "Body",
        createdAt: new Date(),
      };
      const result = createTextPresetSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(
          (result.data as Record<string, unknown>).createdAt
        ).toBeUndefined();
      }
    });

    it("should reject empty name", () => {
      const result = createTextPresetSchema.safeParse({
        name: "",
        body: "Body",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty body", () => {
      const result = createTextPresetSchema.safeParse({
        name: "Name",
        body: "",
      });
      expect(result.success).toBe(false);
    });

    it("should enforce max length on name", () => {
      const result = createTextPresetSchema.safeParse({
        name: "a".repeat(101),
        body: "Body",
      });
      expect(result.success).toBe(false);
    });

    it("should enforce max length on body", () => {
      const result = createTextPresetSchema.safeParse({
        name: "Name",
        body: "b".repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateTextPresetSchema", () => {
    it("should validate an update with only id", () => {
      const updateData = {
        id: randomUUID(),
      };
      const result = updateTextPresetSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it("should validate a partial update with id and name", () => {
      const updateData = {
        id: randomUUID(),
        name: "Updated Name",
      };
      const result = updateTextPresetSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Name");
        expect(result.data.body).toBeUndefined();
      }
    });

    it("should validate a partial update with multiple fields", () => {
      const updateData = {
        id: randomUUID(),
        name: "Updated",
        body: "Updated body",
        side: "right" as const,
        isEnabled: false,
      };
      const result = updateTextPresetSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.side).toBe("right");
        expect(result.data.isEnabled).toBe(false);
      }
    });

    it("should require id", () => {
      const result = updateTextPresetSchema.safeParse({
        name: "No ID",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid id (non-uuid)", () => {
      const result = updateTextPresetSchema.safeParse({
        id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should still enforce max length on name when provided", () => {
      const result = updateTextPresetSchema.safeParse({
        id: randomUUID(),
        name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should still enforce max length on body when provided", () => {
      const result = updateTextPresetSchema.safeParse({
        id: randomUUID(),
        body: "b".repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it("should still enforce valid side enum when provided", () => {
      const result = updateTextPresetSchema.safeParse({
        id: randomUUID(),
        side: "bottom",
      });
      expect(result.success).toBe(false);
    });

    it("should still enforce imageAlt max length when provided", () => {
      const result = updateTextPresetSchema.safeParse({
        id: randomUUID(),
        imageAlt: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("should allow setting imageUrl to null", () => {
      const result = updateTextPresetSchema.safeParse({
        id: randomUUID(),
        imageUrl: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imageUrl).toBeNull();
      }
    });
  });
});
