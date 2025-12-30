/**
 * Backend API - Room Management
 */
import { Router } from "express";
import { DatabaseService } from "../../lib/services/DatabaseService";
import { WebSocketHub } from "../../lib/services/WebSocketHub";
import { createRoomSchema } from "../../lib/models/Room";
import { randomUUID } from "crypto";

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
    console.error("[Rooms] List error:", error);
    res.status(500).json({ error: String(error) });
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
    });

    const room = db.getRoomById(id);
    res.status(201).json({ room });
  } catch (error) {
    console.error("[Rooms] Create error:", error);
    res.status(500).json({ error: String(error) });
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
    console.error("[Rooms] Get error:", error);
    res.status(500).json({ error: String(error) });
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

    db.updateRoom(req.params.id, req.body);
    const room = db.getRoomById(req.params.id);
    res.json({ room });
  } catch (error) {
    console.error("[Rooms] Update error:", error);
    res.status(500).json({ error: String(error) });
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
    console.error("[Rooms] Delete error:", error);
    res.status(500).json({ error: String(error) });
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
    console.error("[Rooms] Presence error:", error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
