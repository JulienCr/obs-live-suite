import { z } from "zod";

/**
 * Poster rotation schedule item
 */
export const posterRotationSchema = z.object({
  posterId: z.string().uuid(),
  duration: z.number().int().positive(),
  order: z.number().int().min(0),
});

export type PosterRotation = z.infer<typeof posterRotationSchema>;

/**
 * Profile schema
 */
export const profileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Profile name is required").max(100),
  description: z.string().max(500).optional(),
  themeId: z.string().uuid(),
  dskSourceName: z.string().default("Habillage"),
  defaultScene: z.string().optional(),
  posterRotation: z.array(posterRotationSchema).default([]),
  audioSettings: z.object({
    countdownCueEnabled: z.boolean().default(true),
    countdownCueAt: z.number().int().default(10),
    actionSoundsEnabled: z.boolean().default(false),
  }).default({}),
  isActive: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Profile type inferred from schema
 */
export type Profile = z.infer<typeof profileSchema>;

/**
 * Create profile input schema
 */
export const createProfileSchema = profileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;

/**
 * Update profile input schema
 */
export const updateProfileSchema = profileSchema.partial().required({ id: true });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Profile class with business logic
 */
export class ProfileModel {
  private data: Profile;

  constructor(data: Profile) {
    this.data = profileSchema.parse(data);
  }

  /**
   * Get profile ID
   */
  getId(): string {
    return this.data.id;
  }

  /**
   * Get profile name
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
   * Get theme ID
   */
  getThemeId(): string {
    return this.data.themeId;
  }

  /**
   * Get DSK source name
   */
  getDskSourceName(): string {
    return this.data.dskSourceName;
  }

  /**
   * Get poster rotation schedule
   */
  getPosterRotation(): PosterRotation[] {
    return [...this.data.posterRotation];
  }

  /**
   * Check if profile is active
   */
  isActiveProfile(): boolean {
    return this.data.isActive;
  }

  /**
   * Activate profile
   */
  activate(): void {
    this.data.isActive = true;
    this.data.updatedAt = new Date();
  }

  /**
   * Deactivate profile
   */
  deactivate(): void {
    this.data.isActive = false;
    this.data.updatedAt = new Date();
  }

  /**
   * Add poster to rotation
   */
  addPosterToRotation(posterId: string, duration: number): void {
    const maxOrder = Math.max(0, ...this.data.posterRotation.map((r) => r.order));
    this.data.posterRotation.push({
      posterId,
      duration,
      order: maxOrder + 1,
    });
    this.data.updatedAt = new Date();
  }

  /**
   * Remove poster from rotation
   */
  removePosterFromRotation(posterId: string): void {
    this.data.posterRotation = this.data.posterRotation.filter(
      (r) => r.posterId !== posterId
    );
    this.data.updatedAt = new Date();
  }

  /**
   * Update profile data
   */
  update(updates: Partial<Omit<Profile, "id" | "createdAt">>): void {
    this.data = {
      ...this.data,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Profile {
    return { ...this.data };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: unknown): ProfileModel {
    const parsed = profileSchema.parse(data);
    return new ProfileModel(parsed);
  }
}

