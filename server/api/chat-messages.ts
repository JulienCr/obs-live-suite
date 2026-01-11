/**
 * Backend API - Chat Messages Settings
 */
import { Router } from "express";
import { SettingsService, ChatPredefinedMessage } from "../../lib/services/SettingsService";
import { expressError } from "../../lib/utils/apiError";

const router = Router();

const MAX_MESSAGES = 20;

/**
 * GET /api/chat-messages/settings
 * Get predefined chat messages
 */
router.get("/settings", async (req, res) => {
  try {
    const settingsService = SettingsService.getInstance();
    const messages = settingsService.getChatPredefinedMessages();
    res.json({ messages });
  } catch (error) {
    expressError(res, error, "Failed to get chat messages", { context: "[ChatMessagesAPI]" });
  }
});

/**
 * PUT /api/chat-messages/settings
 * Save predefined chat messages
 */
router.put("/settings", async (req, res) => {
  try {
    const { messages } = req.body;

    // Validate
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages must be an array" });
    }

    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: `Maximum ${MAX_MESSAGES} messages allowed` });
    }

    // Validate each message has title and message properties
    const validMessages: ChatPredefinedMessage[] = [];
    for (const m of messages) {
      if (typeof m !== 'object' || m === null) {
        return res.status(400).json({ error: "Each message must be an object with title and message" });
      }

      const title = typeof m.title === 'string' ? m.title.trim() : '';
      const message = typeof m.message === 'string' ? m.message.trim() : '';

      if (!title || !message) {
        return res.status(400).json({ error: "Each message must have a non-empty title and message" });
      }

      if (title.length > 50) {
        return res.status(400).json({ error: "Title must be 50 characters or less" });
      }

      if (message.length > 500) {
        return res.status(400).json({ error: "Message must be 500 characters or less" });
      }

      validMessages.push({ title, message });
    }

    const settingsService = SettingsService.getInstance();
    settingsService.saveChatPredefinedMessages(validMessages);

    res.json({ success: true, messages: validMessages });
  } catch (error) {
    expressError(res, error, "Failed to save chat messages", { context: "[ChatMessagesAPI]" });
  }
});

export default router;
