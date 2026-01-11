import { Router, Request, Response } from "express";
import { SettingsService } from "@/lib/services/SettingsService";
import { Logger } from "@/lib/utils/Logger";
import { PresenterChannelSettings, presenterChannelSettingsSchema } from "@/lib/models/PresenterChannel";

const router = Router();
const logger = new Logger("PresenterSettingsAPI");

/**
 * GET /api/presenter/settings
 * Get presenter channel settings
 */
router.get("/settings", (req: Request, res: Response) => {
  try {
    const settings = SettingsService.getInstance().getPresenterChannelSettings();
    res.json(settings);
  } catch (error) {
    logger.error("Failed to get presenter settings", error);
    res.status(500).json({ error: "Failed to get presenter settings" });
  }
});

/**
 * PUT /api/presenter/settings
 * Update presenter channel settings
 */
router.put("/settings", (req: Request, res: Response) => {
  try {
    const parsed = presenterChannelSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid settings", details: parsed.error.errors });
    }

    SettingsService.getInstance().savePresenterChannelSettings(parsed.data);
    const updated = SettingsService.getInstance().getPresenterChannelSettings();
    res.json(updated);
  } catch (error) {
    logger.error("Failed to save presenter settings", error);
    res.status(500).json({ error: "Failed to save presenter settings" });
  }
});

export default router;
