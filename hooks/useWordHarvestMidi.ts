"use client";

import { useEffect, useCallback, useRef } from "react";
import { useMidi } from "./useMidi";

interface MidiEventConfig {
  enabled: boolean;
  channel: number;
  cc: number;
  value: number;
}

interface MidiSettings {
  outputName: string;
  wordApproved: MidiEventConfig;
  wordUsed: MidiEventConfig;
  celebration: MidiEventConfig;
  improStart: MidiEventConfig;
}

export type MidiEventName = keyof Omit<MidiSettings, "outputName">;

const DEFAULT_SETTINGS: MidiSettings = {
  outputName: "",
  wordApproved: { enabled: false, channel: 1, cc: 60, value: 127 },
  wordUsed: { enabled: false, channel: 1, cc: 62, value: 127 },
  celebration: { enabled: false, channel: 1, cc: 72, value: 127 },
  improStart: { enabled: false, channel: 1, cc: 64, value: 127 },
};

/**
 * Word Harvest MIDI hook: loads settings from API, sends CC via useMidi.
 * Used by the dashboard panel (regie).
 */
export function useWordHarvestMidi() {
  const { available, sendCC } = useMidi();
  const settingsRef = useRef<MidiSettings>(DEFAULT_SETTINGS);

  // Load MIDI settings from API
  useEffect(() => {
    fetch("/api/settings/word-harvest-midi")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.settings) {
          settingsRef.current = data.settings;
        }
      })
      .catch(() => {});
  }, []);

  const sendMidiEvent = useCallback((eventName: MidiEventName) => {
    const cfg = settingsRef.current[eventName];
    if (!cfg?.enabled) return;
    sendCC(settingsRef.current.outputName, cfg);
  }, [sendCC]);

  return { available, sendMidiEvent };
}
