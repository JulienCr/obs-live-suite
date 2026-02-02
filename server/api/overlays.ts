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
import { createContextHandler } from "../utils/expressRouteHandler";

const router = Router();
const channelManager = ChannelManager.getInstance();
const db = DatabaseService.getInstance();
const logger = new Logger("OverlaysAPI");

// Create contextualized handler
const overlayHandler = createContextHandler("[OverlaysAPI]");

/**
 * POST /api/overlays/lower
 * Control lower third overlay
 */
router.post("/lower", overlayHandler(async (req, res) => {
  const { action, payload } = req.body;

  switch (action) {
    case "show":
      console.log("[Backend] Received lower third show payload:", payload);
      const validated = lowerThirdShowPayloadSchema.parse(payload);
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
}, "Lower third operation failed"));

/**
 * POST /api/overlays/countdown
 * Control countdown timer
 */
router.post("/countdown", overlayHandler(async (req, res) => {
  const { action, payload } = req.body;
  console.log("[Backend] /countdown endpoint hit - action:", action);

  switch (action) {
    case "set":
      const enrichedSetPayload = enrichCountdownPayload(payload, db);
      console.log("[Backend] Enriched countdown with theme:", !!enrichedSetPayload.theme);
      await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.SET, enrichedSetPayload);
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
      let countdownEnrichmentFailed = false;
      try {
        const enrichedUpdatePayload = enrichCountdownPayload(payload || {}, db);
        console.log("[Backend] Enriched countdown update with theme:", !!enrichedUpdatePayload.theme);
        await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.UPDATE, enrichedUpdatePayload);
      } catch (enrichError) {
        console.error("[Backend] Error enriching countdown update:", enrichError);
        await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.UPDATE, payload || {});
        countdownEnrichmentFailed = true;
      }
      return res.json({
        success: true,
        warning: countdownEnrichmentFailed ? "Countdown updated but theme enrichment failed" : undefined,
      });

    case "add-time":
      await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.ADD_TIME, payload);
      break;

    default:
      console.log("[Backend] ❌ UNKNOWN ACTION:", action, "- Available: set, start, pause, reset, update, add-time");
      return res.status(400).json({ error: `Invalid action: ${action}. Available: set, start, pause, reset, update, add-time` });
  }

  res.json({ success: true });
}, "Countdown operation failed"));

/**
 * POST /api/overlays/poster
 * Control poster overlay
 */
router.post("/poster", overlayHandler(async (req, res) => {
  const { action, payload } = req.body;

  switch (action) {
    case "show":
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

    case "chapter-next":
      await channelManager.publish(OverlayChannel.POSTER, PosterEventType.CHAPTER_NEXT);
      break;

    case "chapter-previous":
      await channelManager.publish(OverlayChannel.POSTER, PosterEventType.CHAPTER_PREVIOUS);
      break;

    case "chapter-jump":
      await channelManager.publish(OverlayChannel.POSTER, PosterEventType.CHAPTER_JUMP, payload);
      break;

    default:
      return res.status(400).json({ error: "Invalid action" });
  }

  res.json({ success: true });
}, "Poster operation failed"));

/**
 * POST /api/overlays/poster-bigpicture
 * Control big-picture poster overlay (full-screen centered mode)
 */
router.post("/poster-bigpicture", overlayHandler(async (req, res) => {
  const { action, payload } = req.body;
  const obsManager = OBSConnectionManager.getInstance();

  let obsSourceUpdated = true;

  switch (action) {
    case "show":
      await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.SHOW, payload);
      if (payload && typeof payload === "object") {
        const sourceText = (payload as { source?: string }).source || "";
        try {
          await updatePosterSourceInOBS(obsManager.getOBS(), sourceText);
        } catch (err) {
          logger.warn("Failed to update source-text in OBS", err);
          obsSourceUpdated = false;
        }
      }
      break;

    case "hide":
      await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.HIDE);
      try {
        await updatePosterSourceInOBS(obsManager.getOBS(), "");
      } catch (err) {
        logger.warn("Failed to reset source-text in OBS", err);
        obsSourceUpdated = false;
      }
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

    case "chapter-next":
      await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.CHAPTER_NEXT);
      break;

    case "chapter-previous":
      await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.CHAPTER_PREVIOUS);
      break;

    case "chapter-jump":
      await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.CHAPTER_JUMP, payload);
      break;

    default:
      return res.status(400).json({ error: "Invalid action" });
  }

  res.json({
    success: true,
    warning: obsSourceUpdated ? undefined : "Overlay updated but OBS source update failed",
  });
}, "BigPicture poster operation failed"));

/**
 * POST /api/overlays/chat-highlight
 * Control chat highlight overlay (displays a Twitch/YouTube chat message)
 */
router.post("/chat-highlight", overlayHandler(async (req, res) => {
  const { action, payload } = req.body;

  switch (action) {
    case "show":
      const validated = chatHighlightShowPayloadSchema.parse(payload);
      const settingsService = SettingsService.getInstance();
      const overlaySettings = settingsService.getOverlaySettings();

      let finalPayload = { ...validated };
      if (!overlaySettings.chatHighlightAutoHide) {
        finalPayload.duration = 0;
      } else if (!payload.duration) {
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
}, "Chat highlight operation failed"));

/**
 * POST /api/overlays/clear-all
 * Panic button - clears all overlays immediately
 */
router.post("/clear-all", overlayHandler(async (_req, res) => {
  logger.info("Panic button triggered - clearing all overlays");

  await channelManager.publish(OverlayChannel.LOWER, LowerThirdEventType.HIDE);
  await channelManager.publish(OverlayChannel.COUNTDOWN, CountdownEventType.RESET);
  await channelManager.publish(OverlayChannel.POSTER, PosterEventType.HIDE);
  await channelManager.publish(OverlayChannel.POSTER_BIGPICTURE, PosterEventType.HIDE);
  await channelManager.publish(OverlayChannel.CHAT_HIGHLIGHT, ChatHighlightEventType.HIDE);

  res.json({ success: true });
}, "Clear-all operation failed"));

export default router;
