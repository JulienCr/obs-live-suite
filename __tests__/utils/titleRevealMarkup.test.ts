import { linesToMarkup } from "@/lib/utils/titleRevealMarkup";
import type { TitleLine } from "@/lib/models/TitleReveal";

describe("titleRevealMarkup", () => {
  describe("linesToMarkup", () => {
    it("should return plain text for a single line with default alignment and no offsets", () => {
      const lines: TitleLine[] = [
        { text: "Hello", fontSize: 80, alignment: "l", offsetX: 0, offsetY: 0 },
      ];
      // fontSize is always truthy (80), so it will be included as [s:80]
      const result = linesToMarkup(lines);
      expect(result).toBe("[s:80]Hello[/]");
    });

    it("should include alignment when not default 'l'", () => {
      const lines: TitleLine[] = [
        { text: "Centered", fontSize: 80, alignment: "c", offsetX: 0, offsetY: 0 },
      ];
      const result = linesToMarkup(lines);
      expect(result).toBe("[s:80 a:c]Centered[/]");
    });

    it("should join multiple lines with newline", () => {
      const lines: TitleLine[] = [
        { text: "Line 1", fontSize: 80, alignment: "l", offsetX: 0, offsetY: 0 },
        { text: "Line 2", fontSize: 80, alignment: "l", offsetX: 0, offsetY: 0 },
      ];
      const result = linesToMarkup(lines);
      expect(result).toBe("[s:80]Line 1[/]\n[s:80]Line 2[/]");
    });

    it("should include offsets when non-zero", () => {
      const lines: TitleLine[] = [
        { text: "Offset", fontSize: 80, alignment: "l", offsetX: 50, offsetY: -20 },
      ];
      const result = linesToMarkup(lines);
      expect(result).toBe("[s:80 x:50 y:-20]Offset[/]");
    });

    it("should include all attributes when all are non-default", () => {
      const lines: TitleLine[] = [
        { text: "Full", fontSize: 120, alignment: "r", offsetX: 10, offsetY: 5 },
      ];
      const result = linesToMarkup(lines);
      expect(result).toBe("[s:120 x:10 y:5 a:r]Full[/]");
    });

    it("should omit zero offsets from attributes", () => {
      const lines: TitleLine[] = [
        { text: "No offsets", fontSize: 100, alignment: "l", offsetX: 0, offsetY: 0 },
      ];
      const result = linesToMarkup(lines);
      expect(result).not.toContain("x:");
      expect(result).not.toContain("y:");
    });

    it("should omit default alignment 'l' from attributes", () => {
      const lines: TitleLine[] = [
        { text: "Left", fontSize: 80, alignment: "l", offsetX: 0, offsetY: 0 },
      ];
      const result = linesToMarkup(lines);
      expect(result).not.toContain("a:");
    });

    it("should return empty string for empty lines array", () => {
      const result = linesToMarkup([]);
      expect(result).toBe("");
    });
  });
});
