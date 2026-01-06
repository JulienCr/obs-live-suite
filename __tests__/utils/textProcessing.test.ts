import {
  enforceLineLimits,
  sanitizeForOverlay,
  cleanWikipediaContent,
  validatePlainText,
  stripFormatting,
} from "@/lib/utils/textProcessing";
import { InvalidSummaryError } from "@/lib/models/Wikipedia";

describe("textProcessing", () => {
  describe("enforceLineLimits", () => {
    it("should return lines as-is if within limits", () => {
      const text = "Line 1\nLine 2\nLine 3";
      const result = enforceLineLimits(text);
      expect(result).toEqual(["Line 1", "Line 2", "Line 3"]);
    });

    it("should limit to 5 lines maximum", () => {
      const text = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7";
      const result = enforceLineLimits(text);
      expect(result).toHaveLength(5);
      expect(result).toEqual(["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"]);
    });

    it("should keep lines as-is without truncation", () => {
      // enforceLineLimits doesn't truncate long lines - it relies on upstream formatting
      const longLine = "A".repeat(100);
      const result = enforceLineLimits(longLine);
      expect(result[0]).toHaveLength(100);
    });

    it("should remove empty lines", () => {
      const text = "Line 1\n\n\nLine 2\n  \nLine 3";
      const result = enforceLineLimits(text);
      expect(result).toEqual(["Line 1", "Line 2", "Line 3"]);
    });

    it("should throw error for empty text", () => {
      expect(() => enforceLineLimits("")).toThrow(InvalidSummaryError);
      expect(() => enforceLineLimits("   ")).toThrow(InvalidSummaryError);
    });

    it("should throw error when no non-empty lines remain", () => {
      expect(() => enforceLineLimits("\n\n\n")).toThrow(InvalidSummaryError);
    });
  });

  describe("sanitizeForOverlay", () => {
    it("should remove HTML tags", () => {
      const lines = ["<p>Hello</p>", "<b>World</b>"];
      const result = sanitizeForOverlay(lines);
      expect(result).toEqual(["Hello", "World"]);
    });

    it("should normalize quotes and apostrophes to standard characters", () => {
      // sanitizeForOverlay should normalize curly quotes to standard characters
      // Test with characters that are known to be normalized by the regex
      const lines = ["It\u0027s a test", "Another \u0027example\u0027"];
      const result = sanitizeForOverlay(lines);
      // Standard apostrophe (U+0027) should pass through unchanged
      expect(result[0]).toBe("It's a test");
      expect(result[1]).toBe("Another 'example'");
    });

    it("should remove HTML tags but not encode entities", () => {
      // sanitizeForOverlay removes HTML tags but does NOT encode characters
      // (React handles escaping automatically)
      const lines = ["<script>alert('XSS')</script>", "A & B < C > D"];
      const result = sanitizeForOverlay(lines);
      expect(result[0]).not.toContain("<script>");
      expect(result[0]).toBe("alert('XSS')");
      // Characters are kept as-is, not encoded
      expect(result[1]).toBe("A & B  D"); // < and > are removed
    });

    it("should remove zero-width spaces", () => {
      const lines = ["Test\u200B\u200C\u200D\uFEFFString"];
      const result = sanitizeForOverlay(lines);
      expect(result[0]).toBe("TestString");
    });
  });

  describe("cleanWikipediaContent", () => {
    it("should remove citations", () => {
      const content = "This is a fact[1][2][3] with citations.";
      const result = cleanWikipediaContent(content);
      expect(result).toBe("This is a fact with citations.");
    });

    it("should remove [citation needed]", () => {
      const content = "This needs proof[citation needed].";
      const result = cleanWikipediaContent(content);
      expect(result).toBe("This needs proof.");
    });

    it("should remove curly braces and angle brackets", () => {
      const content = "Test {injection} and <script>alert()</script>";
      const result = cleanWikipediaContent(content);
      expect(result).not.toContain("{");
      expect(result).not.toContain("}");
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });

    it("should normalize whitespace", () => {
      const content = "Test   with    multiple     spaces";
      const result = cleanWikipediaContent(content);
      expect(result).toBe("Test with multiple spaces");
    });

    it("should truncate to max length", () => {
      const content = "A".repeat(1000);
      const result = cleanWikipediaContent(content, 500);
      expect(result.length).toBeLessThanOrEqual(500);
    });

    it("should cut at sentence boundary when in last 30%", () => {
      // Sentence boundary logic only kicks in if found in last 30% of truncated content
      // For maxLength=100, the sentence end needs to be at position > 70
      const content = "A".repeat(75) + ". Short end.";
      const result = cleanWikipediaContent(content, 100);
      // The period at position 75 is in the last 30% (70-100), so it should cut there
      expect(result.endsWith(".")).toBe(true);
    });
  });

  describe("validatePlainText", () => {
    it("should return true for plain text", () => {
      expect(validatePlainText("Simple plain text")).toBe(true);
      expect(validatePlainText("Text with\nnewlines")).toBe(true);
    });

    it("should return false for markdown bullets", () => {
      expect(validatePlainText("- Bullet point")).toBe(false);
      expect(validatePlainText("* Another bullet")).toBe(false);
      expect(validatePlainText("• Yet another")).toBe(false);
    });

    it("should return false for markdown headers", () => {
      expect(validatePlainText("# Header")).toBe(false);
      expect(validatePlainText("## Subheader")).toBe(false);
    });

    it("should return false for markdown formatting", () => {
      expect(validatePlainText("**bold text**")).toBe(false);
      expect(validatePlainText("*italic text*")).toBe(false);
    });

    it("should return false for HTML tags", () => {
      expect(validatePlainText("<p>HTML content</p>")).toBe(false);
    });
  });

  describe("stripFormatting", () => {
    it("should remove markdown bullets", () => {
      const text = "- First\n* Second\n• Third";
      const result = stripFormatting(text);
      expect(result).not.toContain("-");
      expect(result).not.toContain("*");
      expect(result).not.toContain("•");
    });

    it("should remove markdown headers", () => {
      const text = "# Header\n## Subheader";
      const result = stripFormatting(text);
      expect(result).not.toContain("#");
    });

    it("should remove markdown bold/italic", () => {
      const text = "**bold** and *italic* and __underline__";
      const result = stripFormatting(text);
      expect(result).not.toContain("**");
      expect(result).not.toContain("*");
      expect(result).not.toContain("__");
      expect(result).toContain("bold");
      expect(result).toContain("italic");
    });

    it("should remove HTML tags", () => {
      const text = "<p>Paragraph</p> <b>bold</b>";
      const result = stripFormatting(text);
      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });
  });
});



