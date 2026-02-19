import { parseBooleanQueryParam } from "@/lib/utils/queryParams";

describe("parseBooleanQueryParam", () => {
  it('returns true for "true"', () => {
    expect(parseBooleanQueryParam("true")).toBe(true);
  });

  it('returns false for "false"', () => {
    expect(parseBooleanQueryParam("false")).toBe(false);
  });

  it("returns undefined for null", () => {
    expect(parseBooleanQueryParam(null)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseBooleanQueryParam("")).toBeUndefined();
  });

  it('returns undefined for "yes"', () => {
    expect(parseBooleanQueryParam("yes")).toBeUndefined();
  });

  it('returns undefined for "1"', () => {
    expect(parseBooleanQueryParam("1")).toBeUndefined();
  });
});
