/**
 * Backend API - Overlay Control
 */
import { Router } from "express";
import { ChannelManager } from "../../lib/services/ChannelManager";
import { 
  LowerThirdEventType, 
  CountdownEventType, 
  PosterEventType,
  OverlayChannel 
} from "../../lib/models/OverlayEvents";
import { lowerThirdShowPayloadSchema } from "../../lib/models/OverlayEvents";

const router = Router();
const channelManager = ChannelManager.getInstance();

/**
 * POST /api/overlays/lower
 * Control lower third overlay
 */
router.post("/lower", async (req, res) => {
  try {
    const { action, payload } = req.body;

    switch (action) {
      case "show":
        console.log("[Backend] Received lower third show payload:", payload);
        const validated = lowerThirdShowPayloadSchema.parse(payload);
        console.log("[Backend] Validated payload:", validated);
        await channelManager.publish(OverlayChannel.LOWER, LowerThirdEventType.SHOW, validated);
        break;

      case "hide":
        await channelManager.publish(OverlayChannel.LOWER, LowerThirdEventType.HIDE);
        break;

      case "update":
        await channelManager.publish(OverlayChannel.LOWER, LowerThirdEventType.UPDATE, payload);
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Overlays] Lower third error:", error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/overlays/countdown
 * Control countdown timer
 */
router.post("/countdown", async (req, res) => {
  try {
    const { action, payload } = req.body;

    switch (action) {
      case "set":
        await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.SET, payload);
        break;

      case "start":
        await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.START);
        break;

      case "pause":
        await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.PAUSE);
        break;

      case "reset":
        await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.RESET);
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Overlays] Countdown error:", error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/overlays/poster
 * Control poster overlay
 */
router.post("/poster", async (req, res) => {
  try {
    const { action, payload } = req.body;

    switch (action) {
      case "show":
        await channelManager.publish(OverlayChannel.POSTER, PosterEventType.SHOW, payload);
        break;

      case "hide":
        await channelManager.publish(OverlayChannel.POSTER, PosterEventType.HIDE);
        break;

      case "next":
        await channelManager.publish(OverlayChannel.POSTER, PosterEventType.NEXT);
        break;

      case "previous":
        await channelManager.publish(OverlayChannel.POSTER, PosterEventType.PREVIOUS);
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Overlays] Poster error:", error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;

