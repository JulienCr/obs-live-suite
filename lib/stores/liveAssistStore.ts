import { create } from "zustand";
import type { Suggestion } from "@/lib/models/LiveAssist";

interface LiveAssistState {
  suggestions: Suggestion[];
  status: { connected: boolean; device: string | null };
  setAll: (s: Suggestion[]) => void;
  upsert: (s: Suggestion) => void;
  updateStatus: (id: string, status: Suggestion["status"]) => void;
  setStatusBar: (connected: boolean, device: string | null) => void;
}

export const useLiveAssistStore = create<LiveAssistState>((set) => ({
  suggestions: [],
  status: { connected: false, device: null },
  setAll: (suggestions) => set({ suggestions }),
  upsert: (s) => set((st) => ({ suggestions: [s, ...st.suggestions.filter((x) => x.id !== s.id)] })),
  updateStatus: (id, status) =>
    set((st) => ({ suggestions: st.suggestions.map((x) => (x.id === id ? { ...x, status } : x)) })),
  setStatusBar: (connected, device) => set({ status: { connected, device } }),
}));
