"use client";
import { useCallback, useEffect } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { apiGet, apiPost } from "@/lib/utils/ClientFetch";
import { useLiveAssistStore } from "@/lib/stores/liveAssistStore";
import { SuggestionCard } from "@/components/live-assist/SuggestionCard";
import { SttStatusBar } from "@/components/live-assist/SttStatusBar";
import type { LiveAssistEvent, Suggestion } from "@/lib/models/LiveAssist";

const config: PanelConfig = { id: "liveAssist", context: "dashboard" };

export function LiveAssistPanel(_props: IDockviewPanelProps) {
  const { suggestions, setAll, upsert, updateStatus, setStatusBar } = useLiveAssistStore();

  useEffect(() => {
    apiGet<{ suggestions: Suggestion[] }>("/api/live-assist/suggestions")
      .then((d) => setAll(d.suggestions ?? []))
      .catch(() => {});
  }, [setAll]);

  const handleEvent = useCallback(
    (e: LiveAssistEvent) => {
      if (e.type === "suggestion:new") upsert(e.payload.suggestion);
      else if (e.type === "suggestion:update") updateStatus(e.payload.id, e.payload.status);
      else if (e.type === "stt:status") setStatusBar(e.payload.connected, e.payload.device);
    },
    [upsert, updateStatus, setStatusBar],
  );
  useWebSocketChannel<LiveAssistEvent>("live-assist", handleEvent, { logPrefix: "LiveAssistPanel" });

  const onApply = useCallback((s: Suggestion, target: "pin" | "on-air") => {
    const payload = s.intent === "definition" ? { ...s.applyPayload, target } : s.applyPayload;
    apiPost(`/api/live-assist/suggestions/${s.id}/apply`, { intent: s.intent, payload }).catch(() => {});
  }, []);
  const onDismiss = useCallback((s: Suggestion) => {
    apiPost(`/api/live-assist/suggestions/${s.id}/dismiss`, {}).catch(() => {});
  }, []);

  return (
    <BasePanelWrapper config={config}>
      <div className="flex flex-col h-full">
        <SttStatusBar />
        <div className="flex flex-col gap-2 p-3 overflow-auto">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} onApply={onApply} onDismiss={onDismiss} />
          ))}
        </div>
      </div>
    </BasePanelWrapper>
  );
}
