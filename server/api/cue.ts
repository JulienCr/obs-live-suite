/**
 * Backend API - Cue Messaging for Presenter Dashboard
 *
 * Uses a simplified single-channel presenter system (no roomId).
 * All cue messages are broadcast to the single "presenter" channel.
 */
import { Router } from "express";
import { DatabaseService } from "../../lib/services/DatabaseService";
import { ChannelManager } from "../../lib/services/ChannelManager";
import { WebSocketHub } from "../../lib/services/WebSocketHub";
import { createCueMessageSchema, CueType, CueFrom, CueAction } from "../../lib/models/Cue";
import { RoomEventType } from "../../lib/models/OverlayEvents";
import { randomUUID } from "crypto";
import { expressError } from "../../lib/utils/apiError";

const router = Router();
const db = DatabaseService.getInstance();
const channelManager = ChannelManager.getInstance();
const wsHub = WebSocketHub.getInstance();

// Set up the presenter join callback to send replay
wsHub.setOnPresenterJoinCallback((clientId, _role) => {
  const messages = db.getRecentMessages(50);
  const pinnedMessages = db.getPinnedMessages();
  wsHub.sendReplay(clientId, messages, pinnedMessages);
});

/**
 * POST /api/cue/send
 * Send a cue message to the presenter channel
 */
router.post("/send", async (req, res) => {
  try {
    const input = createCueMessageSchema.parse(req.body);
    const id = randomUUID();

    const message = db.createMessage({
      id,
      type: input.type,
      fromRole: input.from,
      severity: input.severity || null,
      title: input.title || null,
      body: input.body || null,
      pinned: input.pinned || false,
      actions: input.actions || [],
      countdownPayload: input.countdownPayload || null,
      contextPayload: input.contextPayload || null,
      questionPayload: input.questionPayload || null,
      seenBy: [],
      ackedBy: [],
      resolvedAt: null,
      resolvedBy: null,
    });

    // Publish to presenter channel
    await channelManager.publishToPresenter(RoomEventType.MESSAGE, message);

    // Clean up old messages (keep last 100)
    db.deleteOldMessages(100);

    res.status(201).json({ message });
  } catch (error) {
    expressError(res, error, "Failed to send cue", { context: "[CueAPI]" });
  }
});

/**
 * GET /api/cue/messages
 * Get messages with cursor pagination
 */
router.get("/messages", (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;

    const messages = db.getRecentMessages(limit, cursor);
    const pinnedMessages = db.getPinnedMessages();

    res.json({ messages, pinnedMessages });
  } catch (error) {
    expressError(res, error, "Failed to get messages", { context: "[CueAPI]" });
  }
});

/**
 * POST /api/cue/:messageId/action
 * Perform an action on a message (ack, done, take, skip, pin, unpin)
 */
router.post("/:messageId/action", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { action, clientId } = req.body;

    const message = db.getMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const now = Date.now();

    switch (action) {
      case CueAction.ACK:
        // Add client to ackedBy list
        if (!message.ackedBy.includes(clientId)) {
          db.updateMessage(messageId, {
            ackedBy: [...message.ackedBy, clientId],
            updatedAt: now,
          });
        }
        break;

      case CueAction.DONE:
        // Mark as resolved
        db.updateMessage(messageId, {
          resolvedAt: now,
          resolvedBy: clientId,
          updatedAt: now,
        });
        break;

      case CueAction.CLEAR:
        // Delete the message
        db.deleteMessage(messageId);
        break;

      case CueAction.TAKE:
      case CueAction.SKIP:
        // Mark as resolved with specific action
        db.updateMessage(messageId, {
          resolvedAt: now,
          resolvedBy: clientId,
          updatedAt: now,
        });
        break;

      case CueAction.PIN:
        db.updateMessage(messageId, {
          pinned: true,
          updatedAt: now,
        });
        break;

      case CueAction.UNPIN:
        db.updateMessage(messageId, {
          pinned: false,
          updatedAt: now,
        });
        break;

      default:
        return res.status(400).json({ error: `Invalid action: ${action}` });
    }

    // Get updated message and broadcast
    if (action === CueAction.CLEAR) {
      // Message was deleted - broadcast deletion event
      await channelManager.publishToPresenter(RoomEventType.ACTION, {
        messageId,
        action,
        clientId,
        deleted: true,
      });
      res.json({ deleted: true });
    } else {
      const updated = db.getMessageById(messageId);
      await channelManager.publishToPresenter(RoomEventType.ACTION, {
        messageId,
        action,
        clientId,
        message: updated,
      });
      res.json({ message: updated });
    }
  } catch (error) {
    expressError(res, error, "Failed to perform action", { context: "[CueAPI]" });
  }
});

/**
 * POST /api/cue/promote-question
 * Webhook endpoint for Streamer.bot to promote questions from Twitch chat
 */
router.post("/promote-question", async (req, res) => {
  try {
    const { author, text, messageUrl, platform = "twitch" } = req.body;

    if (!author || !text) {
      return res.status(400).json({ error: "Missing required fields: author, text" });
    }

    const id = randomUUID();

    const message = db.createMessage({
      id,
      type: CueType.QUESTION,
      fromRole: CueFrom.SYSTEM,
      severity: null,
      title: `Question from ${author}`,
      body: text,
      pinned: false,
      actions: [CueAction.TAKE, CueAction.SKIP],
      countdownPayload: null,
      contextPayload: null,
      questionPayload: {
        platform,
        author,
        text,
        messageUrl: messageUrl || undefined,
      },
      seenBy: [],
      ackedBy: [],
      resolvedAt: null,
      resolvedBy: null,
    });

    // Publish to presenter channel
    await channelManager.publishToPresenter(RoomEventType.MESSAGE, message);

    res.status(201).json({ message });
  } catch (error) {
    expressError(res, error, "Failed to promote question", { context: "[CueAPI]" });
  }
});

/**
 * POST /api/cue/:messageId/seen
 * Mark a message as seen by a client
 */
router.post("/:messageId/seen", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { clientId } = req.body;

    const message = db.getMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Add client to seenBy list
    if (!message.seenBy.includes(clientId)) {
      db.updateMessage(messageId, {
        seenBy: [...message.seenBy, clientId],
        updatedAt: Date.now(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    expressError(res, error, "Failed to mark as seen", { context: "[CueAPI]" });
  }
});

/**
 * DELETE /api/cue/clear
 * Clear all cue messages
 */
router.delete("/clear", async (req, res) => {
  try {
    // Clear all messages
    db.clearAllMessages();

    // Broadcast clear event to all clients in the presenter channel
    await channelManager.publishToPresenter(RoomEventType.MESSAGE, {
      type: "clear",
      timestamp: Date.now(),
    });

    res.json({ success: true });
  } catch (error) {
    expressError(res, error, "Failed to clear messages", { context: "[CueAPI]" });
  }
});

export default router;
