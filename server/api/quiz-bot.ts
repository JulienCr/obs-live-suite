import { Router } from "express";
import { QuizViewerInputService, ViewerLimitsConfig } from "../../lib/services/QuizViewerInputService";
import { ChannelManager } from "../../lib/services/ChannelManager";
import { OverlayChannel } from "../../lib/models/OverlayEvents";
import { expressError } from "../../lib/utils/apiError";
import { VIEWER_LIMITS, QUIZ } from "../../lib/config/Constants";

const router = Router();
const channel = ChannelManager.getInstance();

const limits: ViewerLimitsConfig = {
  perUserCooldownMs: VIEWER_LIMITS.PER_USER_COOLDOWN_MS,
  perUserMaxAttempts: VIEWER_LIMITS.PER_USER_MAX_ATTEMPTS,
  globalRps: VIEWER_LIMITS.GLOBAL_RPS,
  firstOrLastWins: "last",
};

const viewer = new QuizViewerInputService(limits);

// Export reset function for use by QuizManager
export function resetViewerInputs(): void {
  viewer.reset();
}

export function getViewerInputService(): QuizViewerInputService {
  return viewer;
}

router.post("/chat", async (req, res) => {
  try {
    const { userId, displayName, message } = req.body || {};
    if (!userId || !message) return res.status(400).json({ error: "userId and message required" });

    const msg = String(message).trim();

    // QCM: !a !b !c !d
    if (/^!([a-d])$/i.test(msg)) {
      const opt = msg[1].toUpperCase();
      const ok = viewer.tryRecord(userId, opt);
      if (ok) {
        await channel.publish(OverlayChannel.QUIZ, "vote.update", {
          counts: viewer.getQcmCounts(),
          percentages: viewer.getQcmPercentages(),
        });
      }
      return res.json({ ok });
    }

    // Closest: !n 123
    const nMatch = msg.match(/^!n\s+(-?\d+)$/i);
    if (nMatch) {
      const val = parseInt(nMatch[1], 10);
      const ok = viewer.tryRecord(userId, val);
      if (ok) {
        const values = viewer.getAllClosestValues();
        await channel.publish(OverlayChannel.QUIZ, "closest.update", {
          leader: undefined,
          value: values[values.length - 1],
        });
      }
      return res.json({ ok });
    }

    // Open: !rep text
    const repMatch = msg.match(/^!rep\s+(.+)$/i);
    if (repMatch) {
      const text = repMatch[1].slice(0, QUIZ.OPEN_ANSWER_MAX_LENGTH);
      const ok = viewer.tryRecord(userId, text);
      if (ok) await channel.publish(OverlayChannel.QUIZ, "answer.submit", { player_id: userId, text });
      return res.json({ ok });
    }

    // Meta commands can be implemented later (!score, !rank)
    return res.json({ ignored: true });
  } catch (error) {
    expressError(res, error, "Chat command processing failed", { context: "[QuizBotAPI]" });
  }
});

export default router;


