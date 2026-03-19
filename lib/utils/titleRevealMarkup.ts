import type { TitleLine } from "@/lib/models/TitleReveal";

// ---------------------------------------------------------------------------
// Convert structured TitleLine[] data to the markup format used by the
// animation engine's markup parser.
// ---------------------------------------------------------------------------

export function linesToMarkup(lines: TitleLine[]): string {
  return lines
    .map((line) => {
      const attrs: string[] = [];
      if (line.fontSize) attrs.push(`s:${line.fontSize}`);
      if (line.offsetX) attrs.push(`x:${line.offsetX}`);
      if (line.offsetY) attrs.push(`y:${line.offsetY}`);
      if (line.alignment && line.alignment !== "l")
        attrs.push(`a:${line.alignment}`);
      if (attrs.length > 0) {
        return `[${attrs.join(" ")}]${line.text}[/]`;
      }
      return line.text;
    })
    .join("\n");
}
