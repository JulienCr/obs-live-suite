"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiGet, apiPost, extractErrorMessage } from "@/lib/utils/ClientFetch";
import type { LiveAssistSettings } from "@/lib/models/LiveAssist";

/**
 * Quick in-panel kill switches for Live Assist, so the operator can stop the
 * assistant fast during a live show without digging into Settings:
 *  - "Écoute" (`enabled`): the master switch — gates STT ingest AND the Python
 *    transcription loop, so flipping it off silences everything.
 *  - "Transcript" (`transcriptDebug`): just the live transcript re-broadcast.
 *
 * Settings are persisted as one whole object (the POST schema-parses the full
 * shape), so we keep the full settings in local state and flip a single flag —
 * sending a partial would reset every other field (keywords, prompts, …) to its
 * default. The backend re-reads settings live, so the toggle takes effect with
 * no restart.
 */
export function LiveAssistControls() {
  const t = useTranslations("dashboard.liveAssist");
  const [settings, setSettings] = useState<LiveAssistSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<{ settings: LiveAssistSettings }>("/api/settings/live-assist")
      .then((d) => setSettings(d.settings))
      .catch(() => {});
  }, []);

  const toggle = useCallback(
    async (key: "enabled" | "transcriptDebug", value: boolean) => {
      setSettings((current) => {
        if (!current) return current;
        const next = { ...current, [key]: value };
        setBusy(true);
        apiPost("/api/settings/live-assist", { settings: next })
          .catch((e) => {
            setSettings(current); // revert on failure
            toast.error(extractErrorMessage(e, t("toggleFailed")));
          })
          .finally(() => setBusy(false));
        return next; // optimistic
      });
    },
    [t],
  );

  if (!settings) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Switch
          id="la-listening"
          checked={settings.enabled}
          disabled={busy}
          onCheckedChange={(v) => toggle("enabled", v)}
        />
        <Label htmlFor="la-listening" className="text-xs cursor-pointer">
          {t("listening")}
        </Label>
      </div>
      <div className="flex items-center gap-1.5">
        <Switch
          id="la-transcript"
          checked={settings.transcriptDebug}
          disabled={busy}
          onCheckedChange={(v) => toggle("transcriptDebug", v)}
        />
        <Label htmlFor="la-transcript" className="text-xs cursor-pointer">
          {t("transcript")}
        </Label>
      </div>
    </div>
  );
}
