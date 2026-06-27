"use client";
import { useCallback, useEffect } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { toast } from "sonner";
import { apiGet, apiPost, extractErrorMessage } from "@/lib/utils/ClientFetch";
import { useLiveAssistStore } from "@/lib/stores/liveAssistStore";
import { SuggestionCard } from "@/components/live-assist/SuggestionCard";
import { SttStatusBar } from "@/components/live-assist/SttStatusBar";
import type { LiveAssistEvent, Suggestion } from "@/lib/models/LiveAssist";

const config: PanelConfig = { id: "liveAssist", context: "dashboard" };

export function LiveAssistPanel(_props: IDockviewPanelProps) {
  const { suggestions, transcripts, setAll, upsert, updateStatus, setStatusBar, addTranscript } =
    useLiveAssistStore();

  useEffect(() => {
    apiGet<{
      suggestions: Suggestion[];
      sttStatus?: { connected: boolean; device: string | null };
    }>("/api/live-assist/suggestions")
      .then((d) => {
        setAll(d.suggestions ?? []);
        if (d.sttStatus) setStatusBar(d.sttStatus.connected, d.sttStatus.device);
      })
      .catch(() => {});
  }, [setAll, setStatusBar]);

  const handleEvent = useCallback(
    (e: LiveAssistEvent) => {
      if (e.type === "suggestion:new") upsert(e.payload.suggestion);
      else if (e.type === "suggestion:update") updateStatus(e.payload.id, e.payload.status);
      else if (e.type === "stt:status") setStatusBar(e.payload.connected, e.payload.device);
      else if (e.type === "transcript") addTranscript(e.payload.text);
    },
    [upsert, updateStatus, setStatusBar, addTranscript],
  );
  useWebSocketChannel<LiveAssistEvent>("live-assist", handleEvent, { logPrefix: "LiveAssistPanel" });

  const onApply = useCallback((s: Suggestion, target: "pin" | "on-air" | "left" | "right") => {
    // The server is authoritative: it reloads the stored suggestion by id and uses
    // its own applyPayload. We only send the runtime pin/on-air choice.
    apiPost(`/api/live-assist/suggestions/${s.id}/apply`, { target }).catch((e) =>
      toast.error(extractErrorMessage(e, "Échec de l'application de la suggestion")),
    );
  }, []);
  const onDismiss = useCallback((s: Suggestion) => {
    apiPost(`/api/live-assist/suggestions/${s.id}/dismiss`, {}).catch((e) =>
      toast.error(extractErrorMessage(e, "Échec du rejet de la suggestion")),
    );
  }, []);

  return (
    <BasePanelWrapper config={config}>
      <div className="flex flex-col h-full">
        <SttStatusBar />
        <div className="flex flex-col gap-2 p-3 overflow-auto flex-1">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} onApply={onApply} onDismiss={onDismiss} />
          ))}
        </div>

        {/* Live transcript — debug view of what the STT actually hears. */}
        {transcripts.length > 0 && (
          <div className="border-t bg-muted/30">
            <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Transcription (debug)
            </div>
            <div className="px-3 pb-2 max-h-40 overflow-auto text-xs font-mono leading-relaxed space-y-0.5">
              {transcripts.map((line, i) => (
                <div key={line.id} className={i === 0 ? "text-foreground" : "text-muted-foreground"}>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BasePanelWrapper>
  );
}
