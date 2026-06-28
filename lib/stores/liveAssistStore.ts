import { create } from "zustand";
import { LIVE_ASSIST } from "@/lib/config/Constants";
import type { Suggestion } from "@/lib/models/LiveAssist";

/** A live transcript line with a stable id (the list is prepended, so the array
 *  index is NOT a stable React key). */
export interface TranscriptLine {
  id: number;
  text: string;
}

interface LiveAssistState {
  suggestions: Suggestion[];
  status: { connected: boolean; device: string | null };
  /** Rolling live transcript (newest first), for debugging what the STT hears. */
  transcripts: TranscriptLine[];
  /** Monotonic counter backing the transcript line ids. */
  transcriptSeq: number;
  setAll: (s: Suggestion[]) => void;
  upsert: (s: Suggestion) => void;
  updateStatus: (id: string, status: Suggestion["status"]) => void;
  clearAll: () => void;
  setStatusBar: (connected: boolean, device: string | null) => void;
  addTranscript: (text: string) => void;
}

export const useLiveAssistStore = create<LiveAssistState>((set) => ({
  suggestions: [],
  status: { connected: false, device: null },
  transcripts: [],
  transcriptSeq: 0,
  setAll: (suggestions) => set({ suggestions }),
  upsert: (s) =>
    set((st) => ({
      suggestions: [s, ...st.suggestions.filter((x) => x.id !== s.id)].slice(0, LIVE_ASSIST.MAX_STORED_SUGGESTIONS),
    })),
  updateStatus: (id, status) =>
    set((st) => ({ suggestions: st.suggestions.map((x) => (x.id === id ? { ...x, status } : x)) })),
  clearAll: () => set({ suggestions: [] }),
  setStatusBar: (connected, device) => set({ status: { connected, device } }),
  addTranscript: (text) =>
    set((st) => {
      const id = st.transcriptSeq + 1;
      return { transcripts: [{ id, text }, ...st.transcripts].slice(0, 50), transcriptSeq: id };
    }),
}));
