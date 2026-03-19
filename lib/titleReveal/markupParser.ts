// ---------------------------------------------------------------------------
// Markup parser for the title-reveal animation
// ---------------------------------------------------------------------------
// Syntax:
//   [s:120 x:50 y:-20 a:r]styled text[/]
//   Plain text outside tags uses defaults
//   \n for line breaks
//
// Supported attributes:
//   s   -- font size in px
//   x   -- horizontal offset in px
//   y   -- vertical offset in px
//   r   -- rotation in deg
//   c   -- color (hex)
//   a   -- alignment relative to first line: l(eft), r(ight), c(enter)
//   g   -- line gap override in px (spacing above this line)

export interface SpanStyle {
  fontSize?: number;
  x?: number;
  y?: number;
  rotation?: number;
  color?: string;
  align?: "l" | "r" | "c";
  gap?: number;
}

export interface Segment {
  text: string;
  style: SpanStyle;
}

export interface Line {
  segments: Segment[];
  align?: "l" | "r" | "c";
  gap?: number;
}

export function parseAttrs(attrs: string): SpanStyle {
  const style: SpanStyle = {};
  for (const part of attrs.split(/\s+/)) {
    const [key, val] = part.split(":");
    if (!val) continue;
    switch (key) {
      case "s":
        style.fontSize = Number(val);
        break;
      case "x":
        style.x = Number(val);
        break;
      case "y":
        style.y = Number(val);
        break;
      case "r":
        style.rotation = Number(val);
        break;
      case "c":
        style.color = val.startsWith("#") ? val : `#${val}`;
        break;
      case "a":
        style.align = val as SpanStyle["align"];
        break;
      case "g":
        style.gap = Number(val);
        break;
    }
  }
  return style;
}

export function parseMarkup(input: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /\[([^\]]*)\](.*?)\[\/\]/gs;
  let lastIndex = 0;

  for (const match of input.matchAll(regex)) {
    if (match.index! > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index!), style: {} });
    }
    segments.push({ text: match[2], style: parseAttrs(match[1]) });
    lastIndex = match.index! + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), style: {} });
  }

  return segments;
}

export function segmentsToLines(segments: Segment[]): Line[] {
  const lines: Line[] = [{ segments: [] }];

  for (const seg of segments) {
    const parts = seg.text.split("\n");
    // First part appends to current line
    if (parts[0].length > 0) {
      const s: Segment = { text: parts[0], style: { ...seg.style } };
      lines[lines.length - 1].segments.push(s);
    }
    // Apply line-level attrs (align, gap) to whichever line this segment starts
    if (seg.style.align) lines[lines.length - 1].align = seg.style.align;
    if (seg.style.gap !== undefined) lines[lines.length - 1].gap = seg.style.gap;

    // Subsequent parts start new lines
    for (let i = 1; i < parts.length; i++) {
      const newLine: Line = { segments: [] };
      if (parts[i].length > 0) {
        const s: Segment = { text: parts[i], style: { ...seg.style } };
        newLine.segments.push(s);
        if (seg.style.align) newLine.align = seg.style.align;
        if (seg.style.gap !== undefined) newLine.gap = seg.style.gap;
      }
      lines.push(newLine);
    }
  }

  return lines;
}
