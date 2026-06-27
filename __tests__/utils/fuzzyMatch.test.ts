import { levenshtein, similarity } from "@/lib/utils/fuzzyMatch";

describe("levenshtein", () => {
  it("is 0 for identical strings", () => {
    expect(levenshtein("eclypsia", "eclypsia")).toBe(0);
  });
  it("counts single edits", () => {
    expect(levenshtein("eclypsia", "eclipsia")).toBe(1); // y→i
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "")).toBe(0);
  });
});

describe("similarity", () => {
  it("is 1 for identical strings", () => {
    expect(similarity("eclypsia", "eclypsia")).toBe(1);
  });
  it("is high for a one-character typo", () => {
    expect(similarity("eclypsia", "eclipsia")).toBeCloseTo(1 - 1 / 8); // 0.875
    expect(similarity("eclypsia", "eclipsia")).toBeGreaterThan(0.8);
  });
  it("is low for unrelated words", () => {
    expect(similarity("eclypsia", "casseroles")).toBeLessThan(0.5);
  });
  it("treats two empty strings as identical", () => {
    expect(similarity("", "")).toBe(1);
  });
});
