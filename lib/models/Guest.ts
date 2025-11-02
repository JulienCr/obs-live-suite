import { z } from "zod";

/**
 * Guest schema for validation
 */
export const guestSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1, "Display name is required").max(100),
  subtitle: z.string().max(200).nullable().default(null),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").default("#3b82f6"),
  avatarUrl: z.string().nullable().default(null),
  isEnabled: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Guest type inferred from schema
 */
export type Guest = z.infer<typeof guestSchema>;

/**
 * Create guest input schema (without generated fields)
 */
export const createGuestSchema = guestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;

/**
 * Update guest input schema (all fields optional except id)
 */
export const updateGuestSchema = guestSchema.partial().required({ id: true });

export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

/**
 * Guest class with business logic
 */
export class GuestModel {
  private data: Guest;

  constructor(data: Guest) {
    this.data = guestSchema.parse(data);
  }

  /**
   * Get guest ID
   */
  getId(): string {
    return this.data.id;
  }

  /**
   * Get display name
   */
  getDisplayName(): string {
    return this.data.displayName;
  }

  /**
   * Get subtitle
   */
  getSubtitle(): string | null {
    return this.data.subtitle;
  }

  /**
   * Get accent color
   */
  getAccentColor(): string {
    return this.data.accentColor;
  }

  /**
   * Get avatar URL
   */
  getAvatarUrl(): string | null {
    return this.data.avatarUrl;
  }

  /**
   * Check if guest is enabled
   */
  isEnabledGuest(): boolean {
    return this.data.isEnabled;
  }

  /**
   * Enable guest
   */
  enable(): void {
    this.data.isEnabled = true;
    this.data.updatedAt = new Date();
  }

  /**
   * Disable guest
   */
  disable(): void {
    this.data.isEnabled = false;
    this.data.updatedAt = new Date();
  }

  /**
   * Update guest data
   */
  update(updates: Partial<Omit<Guest, "id" | "createdAt">>): void {
    this.data = {
      ...this.data,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Guest {
    return { ...this.data };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: unknown): GuestModel {
    const parsed = guestSchema.parse(data);
    return new GuestModel(parsed);
  }
}

