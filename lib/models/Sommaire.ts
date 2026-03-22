import { z } from "zod";

/**
 * Parsed sommaire category structure
 */
export interface SommaireCategory {
  index: number;
  title: string;
  items: string[];
}

/**
 * Show payload schema
 */
export const sommaireShowPayloadSchema = z.object({
  categories: z.array(z.object({
    index: z.number().int().min(0),
    title: z.string().min(1),
    items: z.array(z.string()),
  })).min(1),
  activeIndex: z.number().int().min(-1).default(-1),
  activeSubIndex: z.number().int().min(-1).default(-1),
});

export type SommaireShowPayload = z.infer<typeof sommaireShowPayloadSchema>;

/**
 * Highlight payload schema.
 * activeIndex: category index (-1 = none)
 * activeSubIndex: sub-item index within the category (-1 = whole category highlighted)
 */
export const sommaireHighlightPayloadSchema = z.object({
  activeIndex: z.number().int().min(-1),
  activeSubIndex: z.number().int().min(-1).default(-1),
});

export type SommaireHighlightPayload = z.infer<typeof sommaireHighlightPayloadSchema>;

/**
 * Parse markdown into sommaire categories.
 * Lines starting with # become categories, ## become sub-items.
 */
export function parseSommaireMarkdown(markdown: string): SommaireCategory[] {
  const categories: SommaireCategory[] = [];
  let current: SommaireCategory | null = null;

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      if (current) {
        current.items.push(trimmed.slice(3).trim());
      }
    } else if (trimmed.startsWith("# ")) {
      current = {
        index: categories.length,
        title: trimmed.slice(2).trim(),
        items: [],
      };
      categories.push(current);
    }
  }

  return categories;
}
