import { z } from "zod";

// ---------------------------------------------------------------------------
// TitleLine — individual line configuration
// ---------------------------------------------------------------------------

export const titleLineSchema = z.object({
  text: z.string().min(1, "Text is required"),
  fontSize: z.number().int().positive().default(80),
  alignment: z.enum(["l", "c", "r"]).default("l"),
  offsetX: z.number().default(0),
  offsetY: z.number().default(0),
});

export type TitleLine = z.infer<typeof titleLineSchema>;

// ---------------------------------------------------------------------------
// TitleRevealConfig — full entity
// ---------------------------------------------------------------------------

export const titleRevealConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(200),
  lines: z.array(titleLineSchema).min(1, "At least one line is required"),
  logoUrl: z.string().nullable().default(null),
  fontFamily: z.string().default("Permanent Marker"),
  fontSize: z.number().int().positive().default(80),
  rotation: z.number().default(-5),
  colorText: z.string().default("#F5A623"),
  colorGhostBlue: z.string().default("#7B8DB5"),
  colorGhostNavy: z.string().default("#1B2A6B"),
  duration: z.number().positive().default(8.5),
  soundUrl: z.string().nullable().default(null),
  midiEnabled: z.boolean().default(false),
  midiChannel: z.number().int().min(1).max(16).default(1),
  midiCc: z.number().int().min(0).max(127).default(60),
  midiValue: z.number().int().min(0).max(127).default(127),
  sortOrder: z.number().int().default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type TitleRevealConfig = z.infer<typeof titleRevealConfigSchema>;

// ---------------------------------------------------------------------------
// Create / Update schemas
// ---------------------------------------------------------------------------

export const createTitleRevealSchema = titleRevealConfigSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTitleRevealInput = z.infer<typeof createTitleRevealSchema>;

export const updateTitleRevealSchema = titleRevealConfigSchema
  .partial()
  .required({ id: true });

export type UpdateTitleRevealInput = z.infer<typeof updateTitleRevealSchema>;

// ---------------------------------------------------------------------------
// Title Reveal Defaults (admin settings)
// ---------------------------------------------------------------------------

export const TitleRevealDefaultsSchema = z.object({
  defaultLogoUrl: z.string().nullable().default(null),
  defaultSoundUrl: z.string().nullable().default(null),
  defaultDuration: z.number().positive().default(6.5),
  midiEnabled: z.boolean().default(false),
  midiChannel: z.number().int().min(1).max(16).default(1),
  midiCc: z.number().int().min(0).max(127).default(60),
  midiValue: z.number().int().min(0).max(127).default(127),
});

export type TitleRevealDefaults = z.infer<typeof TitleRevealDefaultsSchema>;

export const DEFAULT_TITLE_REVEAL_DEFAULTS: TitleRevealDefaults = TitleRevealDefaultsSchema.parse({});
