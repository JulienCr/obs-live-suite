"use client";

import { useCallback } from "react";
import { useSettings } from "@/lib/hooks/useSettings";
import { useMidi } from "@/hooks/useMidi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Music, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { WordHarvestMidiSettings as MidiSettingsState, WordHarvestMidiEvent as MidiEventConfig } from "@/lib/services/SettingsService";
import { DEFAULT_WORD_HARVEST_MIDI_SETTINGS } from "@/lib/services/SettingsService";

type MidiEventKey = keyof Omit<MidiSettingsState, "outputName">;

const EVENT_KEYS: MidiEventKey[] = [
  "wordApproved", "wordUsed", "celebration", "improStart",
];

function MidiEventRow({
  eventKey,
  config,
  onChange,
  onTest,
}: {
  eventKey: MidiEventKey;
  config: MidiEventConfig;
  onChange: (key: MidiEventKey, field: keyof MidiEventConfig, value: number | boolean) => void;
  onTest: (key: MidiEventKey) => void;
}) {
  const t = useTranslations("wordHarvest.settings");
  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0">
      <Switch
        checked={config.enabled}
        onCheckedChange={(v) => onChange(eventKey, "enabled", v)}
      />

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{t(`events.${eventKey}`)}</div>
        <div className="text-xs text-muted-foreground">{t(`events.${eventKey}Desc`)}</div>
      </div>

      <div className="space-y-1 w-16">
        <Label className="text-xs text-muted-foreground">{t("channel")}</Label>
        <Input
          type="number"
          min={1}
          max={16}
          value={config.channel}
          onChange={(e) => onChange(eventKey, "channel", Math.max(1, Math.min(16, parseInt(e.target.value) || 1)))}
          disabled={!config.enabled}
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-1 w-16">
        <Label className="text-xs text-muted-foreground">CC</Label>
        <Input
          type="number"
          min={0}
          max={127}
          value={config.cc}
          onChange={(e) => onChange(eventKey, "cc", Math.max(0, Math.min(127, parseInt(e.target.value) || 0)))}
          disabled={!config.enabled}
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-1 w-16">
        <Label className="text-xs text-muted-foreground">Val</Label>
        <Input
          type="number"
          min={0}
          max={127}
          value={config.value}
          onChange={(e) => onChange(eventKey, "value", Math.max(0, Math.min(127, parseInt(e.target.value) || 0)))}
          disabled={!config.enabled}
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-1 w-8">
        <Label className="text-xs text-transparent">T</Label>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!config.enabled}
          onClick={() => onTest(eventKey)}
          title={t("test")}
        >
          <Volume2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function WordHarvestMidiSettings() {
  const t = useTranslations("wordHarvest.settings");
  const { available: midiAvailable, outputs: midiOutputs, sendCC } = useMidi();

  const { data: settings, setData: setSettings, loading, saving, saveResult, save } =
    useSettings<{ settings: MidiSettingsState }, MidiSettingsState>({
      endpoint: "/api/settings/word-harvest-midi",
      initialState: DEFAULT_WORD_HARVEST_MIDI_SETTINGS,
      fromResponse: (res) => res.settings ?? DEFAULT_WORD_HARVEST_MIDI_SETTINGS,
      saveMethod: "POST",
      successMessage: t("savedSuccess"),
    });

  const handleChange = (
    eventKey: MidiEventKey,
    field: keyof MidiEventConfig,
    value: number | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [eventKey]: { ...prev[eventKey], [field]: value },
    }));
  };

  const handleTest = useCallback((eventKey: MidiEventKey) => {
    const cfg = settings[eventKey];
    if (!cfg.enabled) return;
    sendCC(settings.outputName, cfg);
  }, [settings, sendCC]);

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">{t("loading")}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Music className="w-5 h-5" />
          {t("midiTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("midiDescription")}
        </p>

        <div className="space-y-1">
          <Label className="text-sm font-medium">{t("midiOutput")}</Label>
          {!midiAvailable ? (
            <p className="text-xs text-muted-foreground">
              {t("midiNotAvailable")}
            </p>
          ) : midiOutputs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("noMidiDevices")}
            </p>
          ) : (
            <Select
              value={settings.outputName || "__auto__"}
              onValueChange={(v) =>
                setSettings((prev) => ({ ...prev, outputName: v === "__auto__" ? "" : v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectMidiOutput")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">{t("autoFirstAvailable")}</SelectItem>
                {midiOutputs.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {EVENT_KEYS.map((key) => (
          <MidiEventRow
            key={key}
            eventKey={key}
            config={settings[key]}
            onChange={handleChange}
            onTest={handleTest}
          />
        ))}

        <div className="flex items-center gap-2 pt-4">
          <Button onClick={save} disabled={saving} size="sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? t("saving") : t("save")}
          </Button>
          {saveResult && (
            <span className={`text-xs ${saveResult.success ? "text-green-600" : "text-red-600"}`}>
              {saveResult.message}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
