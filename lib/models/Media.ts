import { z } from "zod";

/**
 * Media type enumeration
 */
export enum MediaType {
  YOUTUBE = "youtube",
  MP4 = "mp4",
  IMAGE = "image",
}

/**
 * Media instance enumeration (A or B)
 */
export enum MediaInstance {
  A = "A",
  B = "B",
}

/**
 * Timecode format (HH:MM:SS) with second precision
 */
export const timecodeSchema = z
  .string()
  .regex(/^(?:\d{1,2}:)?[0-5]?\d:[0-5]\d$/, "Invalid timecode format (expected HH:MM:SS or MM:SS)")
  .optional();

/**
 * Pan coordinates for image positioning
 */
export const panSchema = z.object({
  x: z.number().min(-100).max(100).default(0), // Percentage of frame
  y: z.number().min(-100).max(100).default(0), // Percentage of frame
});

export type Pan = z.infer<typeof panSchema>;

/**
 * Media item schema
 */
export const mediaItemSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  type: z.nativeEnum(MediaType),
  title: z.string().optional(),
  thumb: z.string().optional(),
  // Video-specific fields
  start: timecodeSchema,
  end: timecodeSchema,
  // Image-specific fields
  zoom: z.number().min(0.1).max(10).default(1.0).optional(),
  pan: panSchema.optional(),
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MediaItem = z.infer<typeof mediaItemSchema>;

/**
 * Media playlist schema
 */
export const mediaPlaylistSchema = z.object({
  id: z.string().uuid(),
  instance: z.nativeEnum(MediaInstance),
  on: z.boolean().default(false),
  muted: z.boolean().default(true), // Start muted for autoplay compliance
  items: z.array(mediaItemSchema).default([]),
  index: z.number().int().min(0).default(0), // Current item index
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MediaPlaylist = z.infer<typeof mediaPlaylistSchema>;

/**
 * Media item creation input (without generated fields)
 */
export const createMediaItemSchema = mediaItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateMediaItemInput = z.infer<typeof createMediaItemSchema>;

/**
 * Media item update input (partial)
 */
export const updateMediaItemSchema = mediaItemSchema
  .omit({
    id: true,
    url: true,
    type: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export type UpdateMediaItemInput = z.infer<typeof updateMediaItemSchema>;

/**
 * API request schemas
 */
export const addMediaItemRequestSchema = z.object({
  url: z.string().url(),
});

export const updateMediaItemRequestSchema = updateMediaItemSchema;

export const reorderMediaItemsRequestSchema = z.object({
  order: z.array(z.string().uuid()),
});

export const toggleMediaRequestSchema = z.object({
  on: z.boolean(),
});

export const muteMediaRequestSchema = z.object({
  muted: z.boolean(),
});

/**
 * Media state response (for GET /api/media/:instance/state)
 */
export const mediaStateResponseSchema = z.object({
  playlist: mediaPlaylistSchema,
  currentItem: mediaItemSchema.nullable(),
});

export type MediaStateResponse = z.infer<typeof mediaStateResponseSchema>;

/**
 * WebSocket message types for media overlay
 */
export enum MediaEventType {
  // Commands (backoffice/Deck → overlay)
  TOGGLE = "toggle",
  NEXT = "next",
  ADD_ITEM = "addItem",
  UPDATE_ITEM = "updateItem",
  REMOVE_ITEM = "removeItem",
  REORDER = "reorder",
  MUTE = "mute",

  // Events (overlay → backoffice/Deck)
  STATE = "state",
  READY = "ready",
  ERROR = "error",
  EOS = "eos", // End of segment
}

/**
 * WebSocket message payloads
 */
export const mediaTogglePayloadSchema = z.object({
  on: z.boolean(),
});

export const mediaAddItemPayloadSchema = z.object({
  item: mediaItemSchema,
});

export const mediaUpdateItemPayloadSchema = z.object({
  id: z.string().uuid(),
  updates: updateMediaItemSchema,
});

export const mediaRemoveItemPayloadSchema = z.object({
  id: z.string().uuid(),
});

export const mediaReorderPayloadSchema = z.object({
  order: z.array(z.string().uuid()),
});

export const mediaMutePayloadSchema = z.object({
  muted: z.boolean(),
});

export const mediaStatePayloadSchema = z.object({
  on: z.boolean(),
  muted: z.boolean(),
  currentId: z.string().uuid().nullable(),
  index: z.number().int().min(0),
  count: z.number().int().min(0),
});

export const mediaReadyPayloadSchema = z.object({
  id: z.string().uuid(),
});

export const mediaErrorPayloadSchema = z.object({
  id: z.string().uuid(),
  reason: z.string(),
});

export const mediaEosPayloadSchema = z.object({
  id: z.string().uuid(),
});

export type MediaTogglePayload = z.infer<typeof mediaTogglePayloadSchema>;
export type MediaAddItemPayload = z.infer<typeof mediaAddItemPayloadSchema>;
export type MediaUpdateItemPayload = z.infer<typeof mediaUpdateItemPayloadSchema>;
export type MediaRemoveItemPayload = z.infer<typeof mediaRemoveItemPayloadSchema>;
export type MediaReorderPayload = z.infer<typeof mediaReorderPayloadSchema>;
export type MediaMutePayload = z.infer<typeof mediaMutePayloadSchema>;
export type MediaStatePayload = z.infer<typeof mediaStatePayloadSchema>;
export type MediaReadyPayload = z.infer<typeof mediaReadyPayloadSchema>;
export type MediaErrorPayload = z.infer<typeof mediaErrorPayloadSchema>;
export type MediaEosPayload = z.infer<typeof mediaEosPayloadSchema>;
