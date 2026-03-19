import { WORD_HARVEST } from "../../lib/config/Constants";
import {
  startGamePayloadSchema,
  wordActionPayloadSchema,
  harvestWordSchema,
  wordHarvestStateSchema,
} from "../../lib/models/WordHarvest";

describe("startGamePayloadSchema", () => {
  it("accepts valid targetCount", () => {
    const result = startGamePayloadSchema.parse({ targetCount: 5 });
    expect(result.targetCount).toBe(5);
  });

  it("applies default when no targetCount provided", () => {
    const result = startGamePayloadSchema.parse({});
    expect(result.targetCount).toBe(WORD_HARVEST.DEFAULT_TARGET_COUNT);
  });

  it("applies default for empty body", () => {
    const result = startGamePayloadSchema.parse({});
    expect(result.targetCount).toBe(WORD_HARVEST.DEFAULT_TARGET_COUNT);
  });

  it("rejects targetCount below MIN", () => {
    expect(() => startGamePayloadSchema.parse({ targetCount: 1 })).toThrow();
  });

  it("rejects targetCount above MAX", () => {
    expect(() => startGamePayloadSchema.parse({ targetCount: 100 })).toThrow();
  });

  it("rejects non-integer targetCount", () => {
    expect(() => startGamePayloadSchema.parse({ targetCount: 5.5 })).toThrow();
  });

  it("accepts MIN boundary", () => {
    const result = startGamePayloadSchema.parse({ targetCount: WORD_HARVEST.MIN_TARGET_COUNT });
    expect(result.targetCount).toBe(WORD_HARVEST.MIN_TARGET_COUNT);
  });

  it("accepts MAX boundary", () => {
    const result = startGamePayloadSchema.parse({ targetCount: WORD_HARVEST.MAX_TARGET_COUNT });
    expect(result.targetCount).toBe(WORD_HARVEST.MAX_TARGET_COUNT);
  });
});

describe("wordActionPayloadSchema", () => {
  it("accepts valid wordId", () => {
    const result = wordActionPayloadSchema.parse({ wordId: "abc-123" });
    expect(result.wordId).toBe("abc-123");
  });

  it("rejects empty string wordId", () => {
    expect(() => wordActionPayloadSchema.parse({ wordId: "" })).toThrow();
  });

  it("rejects missing wordId", () => {
    expect(() => wordActionPayloadSchema.parse({})).toThrow();
  });
});

describe("harvestWordSchema", () => {
  const validWord = {
    id: "word-1",
    word: "bateau",
    normalizedWord: "bateau",
    submittedBy: "user1",
    displayName: "User1",
    submittedAt: 1700000000000,
    status: "pending" as const,
    used: false,
  };

  it("accepts valid HarvestWord", () => {
    const result = harvestWordSchema.parse(validWord);
    expect(result.word).toBe("bateau");
  });

  it("accepts with optional usedAt", () => {
    const result = harvestWordSchema.parse({ ...validWord, usedAt: 1700000001000 });
    expect(result.usedAt).toBe(1700000001000);
  });

  it("accepts without usedAt", () => {
    const result = harvestWordSchema.parse(validWord);
    expect(result.usedAt).toBeUndefined();
  });

  it("rejects missing required fields", () => {
    expect(() => harvestWordSchema.parse({ id: "x" })).toThrow();
    expect(() => harvestWordSchema.parse({})).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() => harvestWordSchema.parse({ ...validWord, status: "invalid" })).toThrow();
  });
});

describe("wordHarvestStateSchema", () => {
  const validState = {
    phase: "idle" as const,
    targetCount: 10,
    pendingWords: [],
    approvedWords: [],
    visible: false,
  };

  it("accepts valid state", () => {
    const result = wordHarvestStateSchema.parse(validState);
    expect(result.phase).toBe("idle");
  });

  it("accepts all valid phases", () => {
    for (const phase of ["idle", "collecting", "complete", "performing", "done"]) {
      expect(() => wordHarvestStateSchema.parse({ ...validState, phase })).not.toThrow();
    }
  });

  it("rejects invalid phase", () => {
    expect(() => wordHarvestStateSchema.parse({ ...validState, phase: "invalid" })).toThrow();
  });

  it("rejects targetCount below MIN", () => {
    expect(() => wordHarvestStateSchema.parse({ ...validState, targetCount: 1 })).toThrow();
  });

  it("rejects targetCount above MAX", () => {
    expect(() => wordHarvestStateSchema.parse({ ...validState, targetCount: 999 })).toThrow();
  });
});
