import {
  parseAttrs,
  parseMarkup,
  segmentsToLines,
} from "@/lib/titleReveal/markupParser";

describe("markupParser", () => {
  describe("parseAttrs", () => {
    it("should parse s:120 as fontSize", () => {
      const result = parseAttrs("s:120");
      expect(result.fontSize).toBe(120);
    });

    it("should parse x and y offsets", () => {
      const result = parseAttrs("x:50 y:-20");
      expect(result.x).toBe(50);
      expect(result.y).toBe(-20);
    });

    it("should parse a:r as align", () => {
      const result = parseAttrs("a:r");
      expect(result.align).toBe("r");
    });

    it("should parse c:FF0000 and prepend #", () => {
      const result = parseAttrs("c:FF0000");
      expect(result.color).toBe("#FF0000");
    });

    it("should preserve existing # in color", () => {
      const result = parseAttrs("c:#FF0000");
      expect(result.color).toBe("#FF0000");
    });

    it("should parse g:10 as gap", () => {
      const result = parseAttrs("g:10");
      expect(result.gap).toBe(10);
    });

    it("should parse r:45 as rotation", () => {
      const result = parseAttrs("r:45");
      expect(result.rotation).toBe(45);
    });

    it("should ignore unknown keys", () => {
      const result = parseAttrs("z:999 s:80");
      expect(result.fontSize).toBe(80);
      expect((result as Record<string, unknown>).z).toBeUndefined();
    });

    it("should return empty style for empty string", () => {
      const result = parseAttrs("");
      expect(result).toEqual({});
    });

    it("should parse multiple attributes", () => {
      const result = parseAttrs("s:120 x:50 y:-20 a:r");
      expect(result.fontSize).toBe(120);
      expect(result.x).toBe(50);
      expect(result.y).toBe(-20);
      expect(result.align).toBe("r");
    });
  });

  describe("parseMarkup", () => {
    it("should parse plain text as single segment with empty style", () => {
      const result = parseMarkup("Hello World");
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Hello World");
      expect(result[0].style).toEqual({});
    });

    it("should parse styled text", () => {
      const result = parseMarkup("[s:120]TEXT[/]");
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("TEXT");
      expect(result[0].style.fontSize).toBe(120);
    });

    it("should parse mixed plain and styled text", () => {
      const result = parseMarkup("plain[s:80]styled[/]more");
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ text: "plain", style: {} });
      expect(result[1].text).toBe("styled");
      expect(result[1].style.fontSize).toBe(80);
      expect(result[2]).toEqual({ text: "more", style: {} });
    });

    it("should parse multiple styled segments", () => {
      const result = parseMarkup("[s:80]first[/][s:120]second[/]");
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe("first");
      expect(result[0].style.fontSize).toBe(80);
      expect(result[1].text).toBe("second");
      expect(result[1].style.fontSize).toBe(120);
    });

    it("should return empty array for empty input", () => {
      const result = parseMarkup("");
      expect(result).toEqual([]);
    });
  });

  describe("segmentsToLines", () => {
    it("should produce 1 line for a single segment without newlines", () => {
      const segments = [{ text: "Hello", style: {} }];
      const result = segmentsToLines(segments);
      expect(result).toHaveLength(1);
      expect(result[0].segments).toHaveLength(1);
      expect(result[0].segments[0].text).toBe("Hello");
    });

    it("should split on newlines into multiple lines", () => {
      const segments = [{ text: "Line1\nLine2", style: {} }];
      const result = segmentsToLines(segments);
      expect(result).toHaveLength(2);
      expect(result[0].segments[0].text).toBe("Line1");
      expect(result[1].segments[0].text).toBe("Line2");
    });

    it("should propagate alignment from segment to line", () => {
      const segments = [
        { text: "Centered", style: { align: "c" as const } },
      ];
      const result = segmentsToLines(segments);
      expect(result[0].align).toBe("c");
    });

    it("should propagate gap to line", () => {
      const segments = [{ text: "Gapped", style: { gap: 10 } }];
      const result = segmentsToLines(segments);
      expect(result[0].gap).toBe(10);
    });

    it("should handle multiple newlines producing correct number of lines", () => {
      const segments = [{ text: "A\nB\nC", style: {} }];
      const result = segmentsToLines(segments);
      expect(result).toHaveLength(3);
      expect(result[0].segments[0].text).toBe("A");
      expect(result[1].segments[0].text).toBe("B");
      expect(result[2].segments[0].text).toBe("C");
    });

    it("should handle empty segments array", () => {
      const result = segmentsToLines([]);
      expect(result).toHaveLength(1);
      expect(result[0].segments).toHaveLength(0);
    });

    it("should propagate alignment to new lines after newline split", () => {
      const segments = [
        { text: "Line1\nLine2", style: { align: "r" as const } },
      ];
      const result = segmentsToLines(segments);
      expect(result[0].align).toBe("r");
      expect(result[1].align).toBe("r");
    });
  });
});
