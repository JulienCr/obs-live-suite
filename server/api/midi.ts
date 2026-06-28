/**
 * Backend API - Direct MIDI CC sends
 *
 * MIDI is emitted only from the browser (Web MIDI API). This route publishes the
 * validated CC payload on the MIDI WebSocket channel; the always-on dispatcher
 * (hooks/useMidiDispatcher.ts), mounted in the dashboard, turns it into a real
 * Web MIDI send. The dashboard must therefore be open for the CC to leave.
 */
import { Router } from "express";
import { ChannelManager } from "../../lib/services/ChannelManager";
import { midiCcSendSchema } from "../../lib/models/Midi";
import { createContextHandler } from "../utils/expressRouteHandler";

const router = Router();
const channelManager = ChannelManager.getInstance();
const midiHandler = createContextHandler("[MidiAPI]");

/**
 * POST /api/midi/cc
 * Body: { bus, note, value?, channel?, duration? } (see midiCcSendSchema).
 * Sends a CC now, and — when `duration` (seconds) > 0 — the same CC once more
 * after that delay.
 */
router.post("/cc", midiHandler(async (req, res) => {
  const payload = midiCcSendSchema.parse(req.body);
  channelManager.publishMidiCc(payload);
  res.json({ success: true });
}, "Failed to send MIDI CC"));

export default router;
