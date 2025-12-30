import { RoomService } from "../../lib/services/RoomService";
import { DatabaseService } from "../../lib/services/DatabaseService";
import { DEFAULT_ROOM_ID } from "../../lib/models/Room";

describe("RoomService", () => {
  let roomService: RoomService;
  let db: DatabaseService;

  beforeAll(() => {
    roomService = RoomService.getInstance();
    db = DatabaseService.getInstance();
  });

  describe("initializeDefaultRoom", () => {
    it("should create a default room if it doesn't exist", async () => {
      // Clean up any existing default room
      try {
        db.deleteRoom(DEFAULT_ROOM_ID);
      } catch (e) {
        // Room might not exist, that's ok
      }

      // Initialize default room
      await roomService.initializeDefaultRoom();

      // Verify it was created
      const room = db.getRoomById(DEFAULT_ROOM_ID);
      expect(room).toBeDefined();
      expect(room?.id).toBe(DEFAULT_ROOM_ID);
      expect(room?.name).toBe("Default Room");
      expect(room?.quickReplies).toEqual([
        "Ready",
        "Need more context",
        "Delay 1 min",
        "Audio issue",
      ]);
    });

    it("should not create duplicate default room if it already exists", async () => {
      // Initialize once
      await roomService.initializeDefaultRoom();
      const room1 = db.getRoomById("default");

      // Initialize again
      await roomService.initializeDefaultRoom();
      const room2 = db.getRoomById("default");

      // Should be the same room (compare as strings since dates are serialized)
      expect(room1?.createdAt.toString()).toBe(room2?.createdAt.toString());
    });
  });

  describe("getDefaultRoomId", () => {
    it("should return the default room ID", () => {
      expect(roomService.getDefaultRoomId()).toBe(DEFAULT_ROOM_ID);
    });
  });
});

