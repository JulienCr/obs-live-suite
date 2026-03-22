"use client";

import { useEffect, useCallback, useRef } from "react";
import { useMidi } from "./useMidi";
import type { WordHarvestMidiSettings } from "@/lib/models/WordHarvest";
import { DEFAULT_WORD_HARVEST_MIDI_SETTINGS } from "@/lib/models/WordHarvest";

export type MidiEventName = keyof Omit<WordHarvestMidiSettings, "outputName">;

/**
 * Word Harvest MIDI hook: loads settings from API, sends CC via useMidi.
 * Used by the dashboard panel (regie).
 */
export function useWordHarvestMidi() {
  const { available, sendCC } = useMidi();
  const settingsRef = useRef<WordHarvestMidiSettings>(DEFAULT_WORD_HARVEST_MIDI_SETTINGS);

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
