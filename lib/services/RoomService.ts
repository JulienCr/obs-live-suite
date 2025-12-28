import { DatabaseService } from "./DatabaseService";
import { Logger } from "../utils/Logger";
import { DEFAULT_QUICK_REPLIES, DEFAULT_ROOM_ID } from "../models/Room";

/**
 * RoomService manages presenter rooms and ensures default room exists
 */
export class RoomService {
  private static instance: RoomService;
  private db: DatabaseService;
  private logger: Logger;
  private defaultRoomId = DEFAULT_ROOM_ID;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.logger = new Logger("RoomService");
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  /**
   * Initialize default room if it doesn't exist
   * This runs on server startup and ensures a default room is always available
   */
  async initializeDefaultRoom(): Promise<void> {
    this.logger.info("Initializing default room...");

    try {
      // Check if default room exists
      const existingRoom = this.db.getRoomById(this.defaultRoomId);

      if (!existingRoom) {
        // Create default room
        this.db.createRoom({
          id: this.defaultRoomId,
          name: "Default Room",
          vdoNinjaUrl: null,
          twitchChatUrl: null,
          quickReplies: DEFAULT_QUICK_REPLIES,
          canSendCustomMessages: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        this.logger.info("✓ Created default room");
      } else {
        this.logger.info("✓ Default room exists");
      }
    } catch (error) {
      this.logger.error("Failed to initialize default room:", error);
      throw error;
    }
  }

  /**
   * Get the default room ID
   */
  getDefaultRoomId(): string {
    return this.defaultRoomId;
  }
}

