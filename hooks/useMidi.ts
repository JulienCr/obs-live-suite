"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface MidiCCParams {
  channel: number; // 1-16
  cc: number; // 0-127 (CC number)
  value: number; // 0-127
}

/**
 * Low-level MIDI hook: manages Web MIDI access, output discovery, and CC sending.
 * Single source of truth for all MIDI operations.
 */
export function useMidi() {
  const [available, setAvailable] = useState(false);
  const [outputs, setOutputs] = useState<string[]>([]);
  const midiAccessRef = useRef<MIDIAccess | null>(null);

  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;

    let cancelled = false;
    navigator.requestMIDIAccess().then(
      (access) => {
        if (cancelled) return;
        midiAccessRef.current = access;
        setAvailable(true);

        const updateOutputs = () => {
          const names: string[] = [];
          access.outputs.forEach((o) => names.push(o.name || `Output ${o.id}`));
          if (!cancelled) setOutputs(names);
        };
        updateOutputs();
        access.onstatechange = updateOutputs;
      },
      () => { if (!cancelled) setAvailable(false); }
    );

    return () => {
      cancelled = true;
      if (midiAccessRef.current) {
        midiAccessRef.current.onstatechange = null;
      }
    };
  }, []);

  /**
   * Send a Control Change (CC) message to a MIDI output.
   * @param outputName - Target output name ("" = first available)
   * @param params - channel (1-16), cc (0-127), value (0-127)
   */
  const sendCC = useCallback((outputName: string, params: MidiCCParams) => {
    const access = midiAccessRef.current;
    if (!access) return;

    let output: MIDIOutput | undefined;
    if (outputName) {
      // Named output: send only to that exact port. If it isn't connected, skip
      // rather than fall back to the first available output (which would mis-send
      // to the wrong device — e.g. a typo'd or momentarily disconnected port).
      access.outputs.forEach((o) => {
        if (o.name === outputName) output = o;
      });
      if (!output) {
        console.warn(`[useMidi] MIDI output "${outputName}" not found; skipping send.`);
        return;
      }
    } else {
      // "" = explicit "first available output" convention.
      const first = access.outputs.values().next();
      if (!first.done) output = first.value;
    }
    if (!output) return;

    const ch = (params.channel - 1) & 0x0f;
    const statusByte = 0xb0 | ch; // CC status byte
    const cc = params.cc & 0x7f;
    const val = params.value & 0x7f;

    output.send([statusByte, cc, val]);
  }, []);

  return { available, outputs, sendCC };
}
