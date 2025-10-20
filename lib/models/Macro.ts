import { z } from "zod";

/**
 * Macro action types
 */
export enum MacroActionType {
  LOWER_SHOW = "lower.show",
  LOWER_HIDE = "lower.hide",
  COUNTDOWN_START = "countdown.start",
  COUNTDOWN_PAUSE = "countdown.pause",
  COUNTDOWN_RESET = "countdown.reset",
  POSTER_SHOW = "poster.show",
  POSTER_HIDE = "poster.hide",
  DELAY = "delay",
  OBS_SCENE_SWITCH = "obs.scene.switch",
}

/**
 * Base macro action schema
 */
export const macroActionSchema = z.object({
  type: z.nativeEnum(MacroActionType),
  params: z.record(z.unknown()).optional(),
  delayAfter: z.number().int().min(0).default(0),
});

export type MacroAction = z.infer<typeof macroActionSchema>;

/**
 * Macro schema
 */
export const macroSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Macro name is required").max(100),
  description: z.string().max(500).optional(),
  actions: z.array(macroActionSchema).min(1, "At least one action required"),
  hotkey: z.string().max(50).optional(),
  profileId: z.string().uuid().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Macro type inferred from schema
 */
export type Macro = z.infer<typeof macroSchema>;

/**
 * Create macro input schema
 */
export const createMacroSchema = macroSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateMacroInput = z.infer<typeof createMacroSchema>;

/**
 * Update macro input schema
 */
export const updateMacroSchema = macroSchema.partial().required({ id: true });

export type UpdateMacroInput = z.infer<typeof updateMacroSchema>;

/**
 * Macro class with business logic
 */
export class MacroModel {
  private data: Macro;

  constructor(data: Macro) {
    this.data = macroSchema.parse(data);
  }

  /**
   * Get macro ID
   */
  getId(): string {
    return this.data.id;
  }

  /**
   * Get macro name
   */
  getName(): string {
    return this.data.name;
  }

  /**
   * Get description
   */
  getDescription(): string | undefined {
    return this.data.description;
  }

  /**
   * Get actions
   */
  getActions(): MacroAction[] {
    return [...this.data.actions];
  }

  /**
   * Get hotkey
   */
  getHotkey(): string | undefined {
    return this.data.hotkey;
  }

  /**
   * Get total estimated duration
   */
  getEstimatedDuration(): number {
    return this.data.actions.reduce((total, action) => total + action.delayAfter, 0);
  }

  /**
   * Check if macro belongs to profile
   */
  belongsToProfile(profileId: string): boolean {
    return this.data.profileId === profileId;
  }

  /**
   * Update macro data
   */
  update(updates: Partial<Omit<Macro, "id" | "createdAt">>): void {
    this.data = {
      ...this.data,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Macro {
    return { ...this.data };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: unknown): MacroModel {
    const parsed = macroSchema.parse(data);
    return new MacroModel(parsed);
  }
}

