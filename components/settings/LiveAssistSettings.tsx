"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mic } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";
import { LiveAssistSettingsSchema, type LiveAssistSettings as Settings, type SttDevice } from "@/lib/models/LiveAssist";

export function LiveAssistSettings() {
  const t = useTranslations("settings.liveAssist");
  const [devices, setDevices] = useState<SttDevice[]>([]);

  const { data, setData, loading, saving, saveResult, save } = useSettings<
    { settings: Settings; devices: SttDevice[] },
    Settings
  >({
    endpoint: "/api/settings/live-assist",
    // Single source of truth: derive the pre-load defaults from the schema (which
    // itself defaults from LIVE_ASSIST) instead of re-hardcoding the literals.
    initialState: LiveAssistSettingsSchema.parse({}),
    fromResponse: (res) => {
      setDevices(res.devices ?? []);
      return res.settings;
    },
    toPayload: (state) => ({ settings: state }),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold mb-1">{t("title")}</h2>
      </div>

      {/* Enabled */}
      <div className="flex items-center justify-between">
        <Label htmlFor="liveAssistEnabled" className="text-base font-medium">
          {t("enabled")}
        </Label>
        <Switch
          id="liveAssistEnabled"
          checked={data.enabled}
          onCheckedChange={(checked) => setData({ ...data, enabled: checked })}
        />
      </div>

      {/* Transcription debug — re-broadcasts each STT segment to the panel's live
          debug view. Off by default to avoid loading the websocket for nothing. */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="liveAssistTranscriptDebug" className="text-base font-medium">
            {t("transcriptDebug")}
          </Label>
          <p className="text-sm text-muted-foreground">{t("transcriptDebugHelp")}</p>
        </div>
        <Switch
          id="liveAssistTranscriptDebug"
          checked={data.transcriptDebug}
          onCheckedChange={(checked) => setData({ ...data, transcriptDebug: checked })}
        />
      </div>

      {/* Local posters — fuzzy-match spoken words against existing poster titles (no LLM). */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="liveAssistLocalPosters" className="text-base font-medium">
            {t("localPosters")}
          </Label>
          <p className="text-sm text-muted-foreground">{t("localPostersHelp")}</p>
        </div>
        <Switch
          id="liveAssistLocalPosters"
          checked={data.localPostersEnabled}
          onCheckedChange={(checked) => setData({ ...data, localPostersEnabled: checked })}
        />
      </div>

      {data.localPostersEnabled && (
        <div className="space-y-3">
          <Label className="text-base font-medium">{t("localPosterSensitivity")}</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[data.localPosterMinSimilarity]}
              onValueChange={([v]) => setData({ ...data, localPosterMinSimilarity: v })}
              min={0.5}
              max={1}
              step={0.05}
              className="flex-1"
            />
            <span className="text-sm font-mono w-12 text-right">{data.localPosterMinSimilarity.toFixed(2)}</span>
          </div>

          {/* Dry-run: log would-be matches to the transcript file without firing cards. */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="space-y-1">
              <Label htmlFor="liveAssistLocalPostersShadow" className="text-sm font-medium">
                {t("localPostersShadow")}
              </Label>
              <p className="text-sm text-muted-foreground">{t("localPostersShadowHelp")}</p>
            </div>
            <Switch
              id="liveAssistLocalPostersShadow"
              checked={data.localPostersShadow}
              onCheckedChange={(checked) => setData({ ...data, localPostersShadow: checked })}
            />
          </div>

          {/* Show-domain keywords: let an everyday-word title (e.g. "Pilote") fire when one
              is spoken nearby. Distinctive titles fire without them. Comma-separated. */}
          <div className="space-y-1 pt-1">
            <Label htmlFor="liveAssistDomainKeywords" className="text-sm font-medium">
              {t("localPosterDomainKeywords")}
            </Label>
            <p className="text-sm text-muted-foreground">{t("localPosterDomainKeywordsHelp")}</p>
            <Input
              id="liveAssistDomainKeywords"
              value={data.localPosterDomainKeywords.join(", ")}
              onChange={(e) =>
                setData({
                  ...data,
                  localPosterDomainKeywords: e.target.value
                    .split(",")
                    .map((w) => w.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>
      )}

      {/* Input device */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4" />
          <Label className="text-base font-medium">{t("device")}</Label>
        </div>
        {devices.length > 0 ? (
          <select
            value={data.inputDevice ?? ""}
            onChange={(e) => setData({ ...data, inputDevice: e.target.value || null })}
            className="w-full p-2 border rounded bg-background text-foreground border-input"
          >
            <option value="">—</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        ) : (
          <Alert>
            <AlertDescription className="text-sm">{t("noDevices")}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Whisper model */}
      <div className="space-y-2">
        <Label htmlFor="whisperModel" className="text-base font-medium">
          {t("model")}
        </Label>
        <Input
          id="whisperModel"
          value={data.whisperModel}
          onChange={(e) => setData({ ...data, whisperModel: e.target.value })}
        />
      </div>

      {/* Per-provider editors: keywords + the extraction context prompt (the "Règle"
          injected into the LLM). Leaving the prompt empty falls back to the
          provider's built-in default. */}
      {Object.entries(data.keywordsByProvider).map(([provider, words]) => (
        <div key={provider} className="space-y-2 rounded-md border p-3">
          <Label className="text-base font-medium">{provider}</Label>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("keywords")}</Label>
            <Input
              value={words.join(", ")}
              onChange={(e) =>
                setData({
                  ...data,
                  keywordsByProvider: {
                    ...data.keywordsByProvider,
                    [provider]: e.target.value
                      .split(",")
                      .map((w) => w.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("contextPrompt")}</Label>
            <Textarea
              rows={2}
              placeholder={t("contextPromptPlaceholder")}
              value={data.contextPromptsByProvider?.[provider] ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  contextPromptsByProvider: {
                    ...data.contextPromptsByProvider,
                    [provider]: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      ))}

      {/* Context window before */}
      <div className="space-y-3">
        <Label className="text-base font-medium">{t("windowBefore")}</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[data.windowBeforeSec]}
            onValueChange={([v]) => setData({ ...data, windowBeforeSec: v })}
            min={0}
            max={60}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-mono w-12 text-right">{data.windowBeforeSec}s</span>
        </div>
      </div>

      {/* Context window after */}
      <div className="space-y-3">
        <Label className="text-base font-medium">{t("windowAfter")}</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[data.windowAfterSec]}
            onValueChange={([v]) => setData({ ...data, windowAfterSec: v })}
            min={0}
            max={60}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-mono w-12 text-right">{data.windowAfterSec}s</span>
        </div>
      </div>

      {/* Confidence threshold */}
      <div className="space-y-3">
        <Label className="text-base font-medium">{t("threshold")}</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[data.confidenceThreshold]}
            onValueChange={([v]) => setData({ ...data, confidenceThreshold: v })}
            min={0}
            max={1}
            step={0.05}
            className="flex-1"
          />
          <span className="text-sm font-mono w-12 text-right">{data.confidenceThreshold.toFixed(2)}</span>
        </div>
      </div>

      {saveResult && (
        <Alert variant={saveResult.success ? "default" : "destructive"}>
          <AlertDescription>{saveResult.message}</AlertDescription>
        </Alert>
      )}

      <Button onClick={save} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t("saving")}
          </>
        ) : (
          t("save")
        )}
      </Button>
    </div>
  );
}
