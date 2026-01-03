/**
 * Backend API - Room Management
 */
import { Router } from "express";
import { DatabaseService } from "../../lib/services/DatabaseService";
import { WebSocketHub } from "../../lib/services/WebSocketHub";
import { createRoomSchema } from "../../lib/models/Room";
import { randomUUID } from "crypto";
import { expressError } from "../../lib/utils/apiError";

const router = Router();
const db = DatabaseService.getInstance();
const wsHub = WebSocketHub.getInstance();

/**
 * GET /api/rooms
 * List all rooms
 */
router.get("/", (req, res) => {
  try {
    const rooms = db.getAllRooms();
    res.json({ rooms });
  } catch (error) {
    expressError(res, error, "Failed to list rooms", { context: "[RoomsAPI]" });
  }
});

/**
 * POST /api/rooms
 * Create a new room
 */
router.post("/", (req, res) => {
  try {
    const input = createRoomSchema.parse(req.body);
    const id = randomUUID();

    db.createRoom({
      id,
      name: input.name,
      vdoNinjaUrl: input.vdoNinjaUrl || null,
      twitchChatUrl: input.twitchChatUrl || null,
      quickReplies: input.quickReplies || ["Ready", "Need more context", "Delay 1 min", "Audio issue"],
      canSendCustomMessages: input.canSendCustomMessages ?? false,
      allowPresenterToSendMessage: input.allowPresenterToSendMessage ?? false,
      streamerbotConnection: input.streamerbotConnection ? JSON.stringify(input.streamerbotConnection) : null,
    });

    const room = db.getRoomById(id);
    res.status(201).json({ room });
  } catch (error) {
    expressError(res, error, "Failed to create room", { context: "[RoomsAPI]" });
  }
});

/**
 * GET /api/rooms/:id
 * Get room by ID
 */
router.get("/:id", (req, res) => {
  try {
    const room = db.getRoomById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json({ room });
  } catch (error) {
    expressError(res, error, "Failed to get room", { context: "[RoomsAPI]" });
  }
});

/**
 * PUT /api/rooms/:id
 * Update a room
 */
router.put("/:id", (req, res) => {
  try {
    const existing = db.getRoomById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Stringify streamerbotConnection if it's an object
    const updates = { ...req.body };
    if (updates.streamerbotConnection && typeof updates.streamerbotConnection === "object") {
      updates.streamerbotConnection = JSON.stringify(updates.streamerbotConnection);
    }

    db.updateRoom(req.params.id, updates);
    const room = db.getRoomById(req.params.id);
    res.json({ room });
  } catch (error) {
    expressError(res, error, "Failed to update room", { context: "[RoomsAPI]" });
  }
});

/**
 * DELETE /api/rooms/:id
 * Delete a room
 */
router.delete("/:id", (req, res) => {
  try {
    const existing = db.getRoomById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Room not found" });
    }

    db.deleteRoom(req.params.id);
    res.json({ success: true });
  } catch (error) {
    expressError(res, error, "Failed to delete room", { context: "[RoomsAPI]" });
  }
});

/**
 * GET /api/rooms/:id/presence
 * Get room presence
 */
router.get("/:id/presence", (req, res) => {
  try {
    const room = db.getRoomById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const presence = wsHub.getPresence(req.params.id);
    res.json({ presence });
  } catch (error) {
    expressError(res, error, "Failed to get room presence", { context: "[RoomsAPI]" });
  }
});

export default router;
