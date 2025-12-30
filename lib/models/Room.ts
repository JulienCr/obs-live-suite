import { z } from "zod";

/**
 * Well-known UUID for the default room
 * This is a fixed UUID that will be used consistently across all installations
 */
export const DEFAULT_ROOM_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Room role types
 */
export enum RoomRole {
  PRESENTER = "presenter",
  CONTROL = "control",
  PRODUCER = "producer",
}

/**
 * Default quick replies for presenter
 */
export const DEFAULT_QUICK_REPLIES = [
  "Ready",
  "Need more context",
  "Delay 1 min",
  "Audio issue",
];

/**
 * Room schema - represents a presenter room configuration
 */
export const roomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  vdoNinjaUrl: z.string().url().optional(),
  twitchChatUrl: z.string().url().optional(),
  quickReplies: z.array(z.string()).default(DEFAULT_QUICK_REPLIES),
  canSendCustomMessages: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Room = z.infer<typeof roomSchema>;

/**
 * Input schema for creating a room
 */
export const createRoomSchema = roomSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

/**
 * Input schema for updating a room
 */
export const updateRoomSchema = roomSchema.partial().required({ id: true });

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

/**
 * Room presence schema - tracks who is connected to a room
 */
export const roomPresenceSchema = z.object({
  roomId: z.string().uuid(),
  clientId: z.string().uuid(),
  role: z.nativeEnum(RoomRole),
  isOnline: z.boolean().default(true),
  lastSeen: z.number(), // timestamp
  lastActivity: z.number().optional(), // timestamp of last action
});

export type RoomPresence = z.infer<typeof roomPresenceSchema>;

/**
 * Room model class for business logic
 */
export class RoomModel {
  private data: Room;

  constructor(data: Room) {
    this.data = roomSchema.parse(data);
  }

  getId(): string {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  getVdoNinjaUrl(): string | undefined {
    return this.data.vdoNinjaUrl;
  }

  getTwitchChatUrl(): string | undefined {
    return this.data.twitchChatUrl;
  }

  getQuickReplies(): string[] {
    return [...this.data.quickReplies];
  }

  setVdoNinjaUrl(url: string | undefined): void {
    this.data.vdoNinjaUrl = url;
    this.data.updatedAt = new Date();
  }

  setTwitchChatUrl(url: string | undefined): void {
    this.data.twitchChatUrl = url;
    this.data.updatedAt = new Date();
  }

  setQuickReplies(replies: string[]): void {
    this.data.quickReplies = [...replies];
    this.data.updatedAt = new Date();
  }

  update(updates: Partial<Omit<Room, "id" | "createdAt">>): void {
    this.data = {
      ...this.data,
      ...updates,
      updatedAt: new Date(),
    };
  }

  toJSON(): Room {
    return { ...this.data };
  }

  static fromJSON(data: unknown): RoomModel {
    return new RoomModel(roomSchema.parse(data));
  }
}
