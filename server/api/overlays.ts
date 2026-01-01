/**
 * Backend API - Overlay Control
 *
 * Consolidated overlay routes with theme enrichment and OBS integration.
 */
import { Router } from "express";
import { ChannelManager } from "../../lib/services/ChannelManager";
import { DatabaseService } from "../../lib/services/DatabaseService";
import { SettingsService } from "../../lib/services/SettingsService";
import { OBSConnectionManager } from "../../lib/adapters/obs/OBSConnectionManager";
import {
  LowerThirdEventType,
  CountdownEventType,
  PosterEventType,
  ChatHighlightEventType,
  OverlayChannel
} from "../../lib/models/OverlayEvents";
import { lowerThirdShowPayloadSchema, chatHighlightShowPayloadSchema } from "../../lib/models/OverlayEvents";
import { enrichLowerThirdPayload, enrichCountdownPayload, enrichPosterPayload, enrichChatHighlightPayload } from "../../lib/utils/themeEnrichment";
import { updatePosterSourceInOBS } from "./obs-helpers";
import { Logger } from "../../lib/utils/Logger";

const router = Router();
const channelManager = ChannelManager.getInstance();
const db = DatabaseService.getInstance();
const logger = new Logger("OverlaysAPI");

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

        // Enrich with theme data using shared utility
        const enrichedPayload = enrichLowerThirdPayload(validated, db);
        console.log("[Backend] Enriched with theme:", !!enrichedPayload.theme);

        await channelManager.publish(OverlayChannel.LOWER, LowerThirdEventType.SHOW, enrichedPayload);
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
    console.log("[Backend] /countdown endpoint hit - action:", action);

    switch (action) {
      case "set":
        // Enrich with theme data using shared utility
        const enrichedPayload = enrichCountdownPayload(payload, db);
        console.log("[Backend] Enriched countdown with theme:", !!enrichedPayload.theme);

        await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.SET, enrichedPayload);
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

      case "update":
        console.log("[Backend] Received countdown update:", payload);
        try {
          // Enrich with theme data using shared utility
          const enrichedUpdatePayload = enrichCountdownPayload(payload || {}, db);
          console.log("[Backend] Enriched countdown update with theme:", !!enrichedUpdatePayload.theme);

          await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.UPDATE, enrichedUpdatePayload);
        } catch (enrichError) {
          console.error("[Backend] Error enriching countdown update:", enrichError);
          // Send update without enrichment if enrichment fails
          await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.UPDATE, payload || {});
        }
        break;

      case "add-time":
        await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.ADD_TIME, payload);
        break;

      default:
        console.log("[Backend] ❌ UNKNOWN ACTION:", action, "- Available: set, start, pause, reset, update, add-time");
        return res.status(400).json({ error: `Invalid action: ${action}. Available: set, start, pause, reset, update, add-time` });
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
        // Enrich with theme data using shared utility
        const enrichedPayload = enrichPosterPayload(payload, db);
        console.log("[Backend] Enriched poster with theme:", !!enrichedPayload.theme);

        await channelManager.publish(OverlayChannel.POSTER, PosterEventType.SHOW, enrichedPayload);
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

      case "play":
        await channelManager.publish(OverlayChannel.POSTER, PosterEventType.PLAY);
        break;

      case "pause":
        await channelManager.publish(OverlayChannel.POSTER, PosterEventType.PAUSE);
        break;

      case "seek":
        await channelManager.publish(OverlayChannel.POSTER, PosterEventType.SEEK, payload);
        break;

      case "mute":
        await channelManager.publish(OverlayChannel.POSTER, PosterEventType.MUTE);
        break;

      case "unmute":
        await channelManager.publish(OverlayChannel.POSTER, PosterEventType.UNMUTE);
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

/**
 * POST /api/overlays/poster-bigpicture
 * Control big-picture poster overlay (full-screen centered mode)
 */
router.post("/poster-bigpicture", async (req, res) => {
  try {
    const { action, payload } = req.body;
    const obsManager = OBSConnectionManager.getInstance();

    switch (action) {
      case "show":
        // No theme enrichment for big-picture (always centered)
        await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.SHOW, payload);
        // Update source text in OBS
        if (payload && typeof payload === "object") {
          const sourceText = (payload as { source?: string }).source || "";
          updatePosterSourceInOBS(obsManager.getOBS(), sourceText).catch((err) => {
            logger.warn("Failed to update source-text in OBS", err);
          });
        }
        break;

      case "hide":
        await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.HIDE);
        // Reset source text in OBS
        updatePosterSourceInOBS(obsManager.getOBS(), "").catch((err) => {
          logger.warn("Failed to reset source-text in OBS", err);
        });
        break;

      case "play":
        await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.PLAY);
        break;

      case "pause":
        await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.PAUSE);
        break;

      case "seek":
        await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.SEEK, payload);
        break;

      case "mute":
        await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.MUTE);
        break;

      case "unmute":
        await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.UNMUTE);
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Overlays] BigPicture Poster error:", error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/overlays/chat-highlight
 * Control chat highlight overlay (displays a Twitch/YouTube chat message)
 */
router.post("/chat-highlight", async (req, res) => {
  try {
    const { action, payload } = req.body;

    switch (action) {
      case "show":
        const validated = chatHighlightShowPayloadSchema.parse(payload);

        // Get overlay settings for duration and auto-hide
        const settingsService = SettingsService.getInstance();
        const overlaySettings = settingsService.getOverlaySettings();

        // Apply duration from settings if not explicitly provided in payload
        // If autoHide is disabled, set duration to 0 (no auto-hide)
        let finalPayload = { ...validated };
        if (!overlaySettings.chatHighlightAutoHide) {
          // Auto-hide disabled: set duration to 0 (overlay won't auto-hide)
          finalPayload.duration = 0;
        } else if (!payload.duration) {
          // Auto-hide enabled but no duration specified: use settings default
          finalPayload.duration = overlaySettings.chatHighlightDuration;
        }

        const enrichedPayload = enrichChatHighlightPayload(finalPayload, db);
        console.log("[Backend] Chat highlight show:", validated.displayName,
          "- duration:", finalPayload.duration,
          "- autoHide:", overlaySettings.chatHighlightAutoHide,
          "- enriched:", !!enrichedPayload.theme);

        await channelManager.publish(OverlayChannel.CHAT_HIGHLIGHT, ChatHighlightEventType.SHOW, enrichedPayload);
        break;

      case "hide":
        await channelManager.publish(OverlayChannel.CHAT_HIGHLIGHT, ChatHighlightEventType.HIDE);
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Overlays] Chat highlight error:", error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;

