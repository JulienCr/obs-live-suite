/**
 * Backend API - Chat Messages Settings
 */
import { Router } from "express";
import { SettingsService } from "../../lib/services/SettingsService";
import { ChatPredefinedMessage, CHAT_MESSAGES_CONFIG } from "../../lib/models/ChatMessages";
import { expressError } from "../../lib/utils/apiError";

const router = Router();

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

    if (messages.length > CHAT_MESSAGES_CONFIG.MAX_MESSAGES) {
      return res.status(400).json({ error: `Maximum ${CHAT_MESSAGES_CONFIG.MAX_MESSAGES} messages allowed` });
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

      if (title.length > CHAT_MESSAGES_CONFIG.MAX_TITLE_LENGTH) {
        return res.status(400).json({ error: `Title must be ${CHAT_MESSAGES_CONFIG.MAX_TITLE_LENGTH} characters or less` });
      }

      if (message.length > CHAT_MESSAGES_CONFIG.MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ error: `Message must be ${CHAT_MESSAGES_CONFIG.MAX_MESSAGE_LENGTH} characters or less` });
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
