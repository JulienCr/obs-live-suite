import { getQuestionTypeColor } from "@/lib/utils/questionTypeColors";

describe("getQuestionTypeColor", () => {
  it('returns blue classes for "qcm"', () => {
    expect(getQuestionTypeColor("qcm")).toBe("bg-blue-100 text-blue-800");
  });

  it('returns purple classes for "closest"', () => {
    expect(getQuestionTypeColor("closest")).toBe(
      "bg-purple-100 text-purple-800"
    );
  });

  it('returns green classes for "open"', () => {
    expect(getQuestionTypeColor("open")).toBe("bg-green-100 text-green-800");
  });

  it('returns yellow classes for "image"', () => {
    expect(getQuestionTypeColor("image")).toBe(
      "bg-yellow-100 text-yellow-800"
    );
  });

  it("returns gray classes for unknown type", () => {
    expect(getQuestionTypeColor("unknown")).toBe("bg-gray-100 text-gray-800");
  });

  it("is case-insensitive", () => {
    expect(getQuestionTypeColor("QCM")).toBe("bg-blue-100 text-blue-800");
    expect(getQuestionTypeColor("Image")).toBe("bg-yellow-100 text-yellow-800");
  });
});
