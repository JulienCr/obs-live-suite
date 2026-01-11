/**
 * Backend API - Chat Messages Settings
 */
import { Router } from "express";
import { SettingsService } from "../../lib/services/SettingsService";
import { chatPredefinedMessagesArraySchema } from "../../lib/models/ChatMessages";
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

    const result = chatPredefinedMessagesArraySchema.safeParse(messages);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }

    const validMessages = result.data.map((m) => ({
      title: m.title.trim(),
      message: m.message.trim(),
    }));

    const settingsService = SettingsService.getInstance();
    settingsService.saveChatPredefinedMessages(validMessages);

    res.json({ success: true, messages: validMessages });
  } catch (error) {
    expressError(res, error, "Failed to save chat messages", { context: "[ChatMessagesAPI]" });
  }
});

export default router;
