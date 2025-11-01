import { z } from "zod";

/**
 * Poster type enum
 */
export enum PosterType {
  IMAGE = "image",
  VIDEO = "video",
  YOUTUBE = "youtube",
}

/**
 * Poster schema for validation
 */
export const posterSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(200),
  fileUrl: z.string().min(1, "File URL is required"),
  type: z.nativeEnum(PosterType),
  duration: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
  profileIds: z.array(z.string().uuid()).default([]),
  metadata: z.record(z.unknown()).optional(),
  isEnabled: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Poster type inferred from schema
 */
export type Poster = z.infer<typeof posterSchema>;

/**
 * Create poster input schema
 */
export const createPosterSchema = posterSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePosterInput = z.infer<typeof createPosterSchema>;

/**
 * Update poster input schema
 */
export const updatePosterSchema = posterSchema.partial().required({ id: true });

export type UpdatePosterInput = z.infer<typeof updatePosterSchema>;

/**
 * Poster class with business logic
 */
export class PosterModel {
  private data: Poster;

  constructor(data: Poster) {
    this.data = posterSchema.parse(data);
  }

  /**
   * Get poster ID
   */
  getId(): string {
    return this.data.id;
  }

  /**
   * Get title
   */
  getTitle(): string {
    return this.data.title;
  }

  /**
   * Get file URL
   */
  getFileUrl(): string {
    return this.data.fileUrl;
  }

  /**
   * Get poster type
   */
  getType(): PosterType {
    return this.data.type;
  }

  /**
   * Get duration (for videos)
   */
  getDuration(): number | undefined {
    return this.data.duration;
  }

  /**
   * Get tags
   */
  getTags(): string[] {
    return [...this.data.tags];
  }

  /**
   * Check if poster is assigned to profile
   */
  isInProfile(profileId: string): boolean {
    return this.data.profileIds.includes(profileId);
  }

  /**
   * Add to profile
   */
  addToProfile(profileId: string): void {
    if (!this.data.profileIds.includes(profileId)) {
      this.data.profileIds.push(profileId);
      this.data.updatedAt = new Date();
    }
  }

  /**
   * Remove from profile
   */
  removeFromProfile(profileId: string): void {
    this.data.profileIds = this.data.profileIds.filter((id) => id !== profileId);
    this.data.updatedAt = new Date();
  }

  /**
   * Check if poster is enabled
   */
  isEnabledPoster(): boolean {
    return this.data.isEnabled;
  }

  /**
   * Enable poster
   */
  enable(): void {
    this.data.isEnabled = true;
    this.data.updatedAt = new Date();
  }

  /**
   * Disable poster
   */
  disable(): void {
    this.data.isEnabled = false;
    this.data.updatedAt = new Date();
  }

  /**
   * Update poster data
   */
  update(updates: Partial<Omit<Poster, "id" | "createdAt">>): void {
    this.data = {
      ...this.data,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Poster {
    return { ...this.data };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: unknown): PosterModel {
    const parsed = posterSchema.parse(data);
    return new PosterModel(parsed);
  }
}

