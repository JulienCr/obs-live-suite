"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSettings } from "@/lib/hooks/useSettings";
import { Button } from "@/components/ui/button";
import type { LiveAssistSettings as Settings, SttDevice } from "@/lib/models/LiveAssist";

export function LiveAssistSettings() {
  const t = useTranslations("settings.liveAssist");
  const [devices, setDevices] = useState<SttDevice[]>([]);

  const { data, setData, saving, save } = useSettings<{ settings: Settings; devices: SttDevice[] }, Settings>({
    endpoint: "/api/settings/live-assist",
    initialState: {
      enabled: false, inputDevice: null, whisperModel: "large-v3",
      keywordsByProvider: { poster: [], definition: [] },
      windowBeforeSec: 15, windowAfterSec: 15, confidenceThreshold: 0.6,
    },
    fromResponse: (res) => {
      setDevices(res.devices ?? []);
      return res.settings;
    },
    toPayload: (state) => ({ settings: state }),
  });

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <h2 className="text-lg font-semibold">{t("title")}</h2>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={data.enabled} onChange={(e) => setData({ ...data, enabled: e.target.checked })} />
        {t("enabled")}
      </label>

      <label className="flex flex-col gap-1">
        {t("device")}
        <select value={data.inputDevice ?? ""} onChange={(e) => setData({ ...data, inputDevice: e.target.value || null })}>
          <option value="">—</option>
          {devices.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        {t("model")}
        <input value={data.whisperModel} onChange={(e) => setData({ ...data, whisperModel: e.target.value })} />
      </label>

      {Object.entries(data.keywordsByProvider).map(([provider, words]) => (
        <label key={provider} className="flex flex-col gap-1">
          {t("keywords")} — {provider}
          <input
            value={words.join(", ")}
            onChange={(e) => setData({ ...data, keywordsByProvider: { ...data.keywordsByProvider, [provider]: e.target.value.split(",").map((w) => w.trim()).filter(Boolean) } })}
          />
        </label>
      ))}

      <div className="flex gap-3">
        <label className="flex flex-col gap-1">{t("windowBefore")}
          <input type="number" value={data.windowBeforeSec} onChange={(e) => setData({ ...data, windowBeforeSec: Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-1">{t("windowAfter")}
          <input type="number" value={data.windowAfterSec} onChange={(e) => setData({ ...data, windowAfterSec: Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-1">{t("threshold")}
          <input type="number" step="0.05" min="0" max="1" value={data.confidenceThreshold} onChange={(e) => setData({ ...data, confidenceThreshold: Number(e.target.value) })} />
        </label>
      </div>

      <Button onClick={save} disabled={saving}>{t("save")}</Button>
    </div>
  );
}
