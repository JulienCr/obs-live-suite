"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMidi } from "./useMidi";
import { useWebSocketChannel } from "./useWebSocketChannel";
import {
  MIDI_TRIGGER_CHANNELS,
  MIDI_CC_CHANNEL,
  MIDI_CC_EVENT,
  WH_EVENT_TO_ACTION,
  DEFAULT_MIDI_SETTINGS,
  DEFAULT_TITLE_REVEAL_DURATION,
  getMessagesForAction,
  getActionOffsetMs,
  getPortForApp,
  midiCcSendSchema,
  type MidiSettings,
} from "@/lib/models/Midi";
import { TitleRevealEventType } from "@/lib/models/OverlayEvents";
import type { WordHarvestEventType } from "@/lib/models/WordHarvest";

/** Shape of the overlay events we care about (channel data payload). */
interface DispatchedEvent {
  type?: string;
  payload?: { duration?: number } & Record<string, unknown>;
}

/**
 * Centralized, always-on MIDI dispatcher.
 *
 * Mounted once in the dashboard shell (NOT tied to any Dockview panel), it
 * listens to the trigger channels declared by MIDI_ACTIONS and sends the
 * configured MIDI messages via Web MIDI (hooks/useMidi.ts).
 *
 * Title Reveal toggle handling: the overlay auto-hides itself at the end of its
 * duration WITHOUT emitting a `hide` event, so the OFF is timed from the play
 * payload's duration. A manual `hide` fires the OFF immediately and cancels the
 * timer; the OFF fires at most once per ON.
 *
 * It also serves direct CC sends (POST /api/midi/cc): a one-shot CC to a named
 * port, optionally re-sent once after `duration` seconds.
 */
export function useMidiDispatcher(): void {
  const { sendCC } = useMidi();
  const settingsRef = useRef<MidiSettings>(DEFAULT_MIDI_SETTINGS);
  const offTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offPendingRef = useRef(false);
  // Pending "second send" timers for direct CC sends with a duration.
  const repeatTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Load the centralized MIDI config, and re-load when the tab regains focus so
  // edits saved from the settings page (possibly in another tab) take effect
  // without requiring a full dashboard remount.
  useEffect(() => {
    const load = () => {
      fetch("/api/settings/midi")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.settings) settingsRef.current = data.settings;
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const fire = useCallback(
    (actionId: string) => {
      const settings = settingsRef.current;
      for (const msg of getMessagesForAction(settings, actionId)) {
        if (!msg.enabled) continue;
        const port = getPortForApp(settings, msg.appId);
        // Unknown app id → skip rather than mis-send to the first available output.
        if (port === null) continue;
        sendCC(port, { channel: msg.channel, cc: msg.cc, value: msg.value });
      }
    },
    [sendCC]
  );

  const clearOffTimer = useCallback(() => {
    if (offTimerRef.current) {
      clearTimeout(offTimerRef.current);
      offTimerRef.current = null;
    }
  }, []);

  const fireOffOnce = useCallback(() => {
    if (!offPendingRef.current) return;
    offPendingRef.current = false;
    clearOffTimer();
    fire("title-reveal.off");
  }, [fire, clearOffTimer]);

  const handleMessage = useCallback(
    (channel: string, data: DispatchedEvent) => {
      if (channel === "title-reveal") {
        if (data?.type === TitleRevealEventType.PLAY) {
          // Overlapping plays: complete a still-pending previous reveal first so
          // the shared toggle CC keeps the FACE in the right state — firing a new
          // ON while an OFF is still pending would otherwise invert it.
          fireOffOnce();
          fire("title-reveal.on");
          // Arm the OFF for the natural end of the jingle.
          clearOffTimer();
          offPendingRef.current = true;
          const raw = data.payload?.duration;
          const durationSec =
            typeof raw === "number" && Number.isFinite(raw) && raw > 0
              ? raw
              : DEFAULT_TITLE_REVEAL_DURATION;
          // Negative offset relights the FACE before the jingle's visual end.
          const offsetMs = getActionOffsetMs(settingsRef.current, "title-reveal.off");
          offTimerRef.current = setTimeout(
            fireOffOnce,
            Math.max(0, durationSec * 1000 + offsetMs)
          );
        } else if (data?.type === TitleRevealEventType.HIDE) {
          // Manual hide before the natural end: fire OFF now.
          fireOffOnce();
        }
        return;
      }

      if (channel === "word-harvest") {
        const actionId = WH_EVENT_TO_ACTION[data?.type as WordHarvestEventType];
        if (actionId) fire(actionId);
        return;
      }

      if (channel === MIDI_CC_CHANNEL) {
        if (data?.type !== MIDI_CC_EVENT) return;
        // Re-validate the WS payload here (not just at the POST route) so
        // malformed traffic on this channel can't drive Web MIDI. Also applies
        // the schema defaults (value/channel/duration).
        const parsed = midiCcSendSchema.safeParse(data.payload);
        if (!parsed.success) return;
        const p = parsed.data;
        // `bus` is the MIDI output port name (e.g. "qlc-in"); `note` is the CC.
        // An unknown/disconnected bus is skipped inside sendCC (no mis-send).
        const send = () =>
          sendCC(p.bus, { channel: p.channel, cc: p.note, value: p.value });
        send();
        if (p.duration > 0) {
          const t = setTimeout(() => {
            repeatTimersRef.current.delete(t);
            send();
          }, p.duration * 1000);
          repeatTimersRef.current.add(t);
        }
      }
    },
    [fire, fireOffOnce, clearOffTimer, sendCC]
  );

  useWebSocketChannel<DispatchedEvent>(
    [...MIDI_TRIGGER_CHANNELS, MIDI_CC_CHANNEL],
    handleMessage,
    { logPrefix: "MidiDispatcher" }
  );

  // Clean up pending timers (OFF + direct-CC re-sends) on unmount.
  useEffect(() => {
    const repeatTimers = repeatTimersRef.current;
    return () => {
      clearOffTimer();
      repeatTimers.forEach(clearTimeout);
      repeatTimers.clear();
    };
  }, [clearOffTimer]);
}
