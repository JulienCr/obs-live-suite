import { z } from "zod";

/**
 * Preset types
 */
export enum PresetType {
  LOWER_THIRD = "lower_third",
  COUNTDOWN = "countdown",
  POSTER = "poster",
  MACRO = "macro",
}

/**
 * Lower third preset payload
 */
export const lowerThirdPayloadSchema = z.object({
  guestId: z.string().uuid().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  side: z.enum(["left", "right"]).default("left"),
  duration: z.number().int().positive().optional(),
});

export type LowerThirdPayload = z.infer<typeof lowerThirdPayloadSchema>;

/**
 * Countdown preset payload
 */
export const countdownPayloadSchema = z.object({
  seconds: z.number().int().positive(),
  autoStart: z.boolean().default(false),
  soundCue: z.boolean().default(true),
  soundCueAt: z.number().int().default(10),
});

export type CountdownPayload = z.infer<typeof countdownPayloadSchema>;

/**
 * Poster preset payload
 */
export const posterPayloadSchema = z.object({
  posterId: z.string().uuid(),
  transition: z.enum(["fade", "slide", "cut", "blur"]).default("fade"),
  duration: z.number().int().positive().optional(),
});

export type PosterPayload = z.infer<typeof posterPayloadSchema>;

/**
 * Macro preset payload
 */
export const macroPayloadSchema = z.object({
  macroId: z.string().uuid(),
});

export type MacroPayload = z.infer<typeof macroPayloadSchema>;

/**
 * Preset schema
 */
export const presetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Preset name is required").max(100),
  type: z.nativeEnum(PresetType),
  payload: z.unknown(),
  profileId: z.string().uuid().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Preset type inferred from schema
 */
export type Preset = z.infer<typeof presetSchema>;

/**
 * Create preset input schema
 */
export const createPresetSchema = presetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePresetInput = z.infer<typeof createPresetSchema>;

/**
 * Update preset input schema
 */
export const updatePresetSchema = presetSchema.partial().required({ id: true });

export type UpdatePresetInput = z.infer<typeof updatePresetSchema>;

/**
 * Preset class with business logic
 */
export class PresetModel {
  private data: Preset;

  constructor(data: Preset) {
    this.data = presetSchema.parse(data);
  }

  /**
   * Get preset ID
   */
  getId(): string {
    return this.data.id;
  }

  /**
   * Get preset name
   */
  getName(): string {
    return this.data.name;
  }

  /**
   * Get preset type
   */
  getType(): PresetType {
    return this.data.type;
  }

  /**
   * Get payload (type-safe based on preset type)
   */
  getPayload<T>(): T {
    return this.data.payload as T;
  }

  /**
   * Validate payload based on preset type
   */
  validatePayload(): boolean {
    switch (this.data.type) {
      case PresetType.LOWER_THIRD:
        return lowerThirdPayloadSchema.safeParse(this.data.payload).success;
      case PresetType.COUNTDOWN:
        return countdownPayloadSchema.safeParse(this.data.payload).success;
      case PresetType.POSTER:
        return posterPayloadSchema.safeParse(this.data.payload).success;
      case PresetType.MACRO:
        return macroPayloadSchema.safeParse(this.data.payload).success;
      default:
        return false;
    }
  }

  /**
   * Check if preset belongs to profile
   */
  belongsToProfile(profileId: string): boolean {
    return this.data.profileId === profileId;
  }

  /**
   * Update preset data
   */
  update(updates: Partial<Omit<Preset, "id" | "createdAt">>): void {
    this.data = {
      ...this.data,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Preset {
    return { ...this.data };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: unknown): PresetModel {
    const parsed = presetSchema.parse(data);
    return new PresetModel(parsed);
  }
}

