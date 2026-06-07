"use client";

import { useCallback } from "react";
import { useSettings } from "@/lib/hooks/useSettings";
import { useMidi } from "@/hooks/useMidi";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Music, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { MidiMessageRow } from "@/components/settings/MidiMessageRow";
import {
  MIDI_ACTIONS,
  DEFAULT_MIDI_SETTINGS,
  getPortForApp,
  getActionOffsetMs,
  actionSupportsOffset,
  type MidiSettings as MidiSettingsType,
  type MidiApp,
  type MidiMessage,
  type MidiActionConfig,
  type MidiActionGroup,
} from "@/lib/models/Midi";

const AUTO = "__auto__";
const ACTION_GROUPS: MidiActionGroup[] = ["titleReveal", "wordHarvest"];

function newMessage(apps: MidiApp[]): MidiMessage {
  return {
    appId: apps[0]?.id ?? "",
    type: "cc",
    channel: 1,
    cc: 81,
    value: 127,
    enabled: true,
  };
}

export function MidiSettings() {
  const t = useTranslations("midi");
  const { available: midiAvailable, outputs, sendCC } = useMidi();

  const { data, setData, loading, saving, saveResult, save } = useSettings<
    { settings: MidiSettingsType },
    MidiSettingsType
  >({
    endpoint: "/api/settings/midi",
    initialState: DEFAULT_MIDI_SETTINGS,
    fromResponse: (res) => res.settings ?? DEFAULT_MIDI_SETTINGS,
    saveMethod: "POST",
    successMessage: t("savedSuccess"),
  });

  // ---- Applications ----
  const updateApp = useCallback(
    (id: string, patch: Partial<MidiApp>) =>
      setData((prev) => ({
        ...prev,
        apps: prev.apps.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })),
    [setData]
  );

  const removeApp = useCallback(
    (id: string) =>
      setData((prev) => ({
        ...prev,
        apps: prev.apps.filter((a) => a.id !== id),
        // Drop messages that targeted the removed app so none dangle with a stale
        // appId (which would otherwise be skipped at best, mis-routed at worst).
        actions: prev.actions.map((action) => ({
          ...action,
          messages: action.messages.filter((m) => m.appId !== id),
        })),
      })),
    [setData]
  );

  const addApp = useCallback(
    () =>
      setData((prev) => ({
        ...prev,
        apps: [...prev.apps, { id: uuidv4(), label: "", port: "" }],
      })),
    [setData]
  );

  // ---- Actions → messages ----
  // Upsert an action from prev state, so batched edits compose and the rest of
  // the action config (e.g. offsetMs) is preserved.
  const patchAction = useCallback(
    (actionId: string, patch: (action: MidiActionConfig) => MidiActionConfig) =>
      setData((prev) => {
        const existing =
          prev.actions.find((a) => a.id === actionId) ??
          ({ id: actionId, offsetMs: 0, messages: [] } as MidiActionConfig);
        return {
          ...prev,
          actions: [...prev.actions.filter((a) => a.id !== actionId), patch(existing)],
        };
      }),
    [setData]
  );

  const updateMessages = useCallback(
    (actionId: string, updater: (messages: MidiMessage[]) => MidiMessage[]) =>
      patchAction(actionId, (a) => ({ ...a, messages: updater(a.messages) })),
    [patchAction]
  );

  const updateOffset = useCallback(
    (actionId: string, offsetMs: number) =>
      patchAction(actionId, (a) => ({ ...a, offsetMs })),
    [patchAction]
  );

  const getMessages = useCallback(
    (actionId: string): MidiMessage[] =>
      data.actions.find((a) => a.id === actionId)?.messages ?? [],
    [data.actions]
  );

  const testMessage = useCallback(
    (msg: MidiMessage) => {
      const port = getPortForApp(data, msg.appId);
      if (port === null) return; // unknown app → nothing to test
      sendCC(port, { channel: msg.channel, cc: msg.cc, value: msg.value });
    },
    [data, sendCC]
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {!midiAvailable ? (
        <p className="text-sm text-amber-600">{t("notAvailable")}</p>
      ) : outputs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noDevices")}</p>
      ) : null}

      {/* Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="w-5 h-5" />
            {t("apps.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("apps.description")}</p>

          {data.apps.map((app) => {
            // Always show the stored port even if the device isn't connected.
            const portOptions =
              app.port && !outputs.includes(app.port)
                ? [app.port, ...outputs]
                : outputs;
            return (
              <div key={app.id} className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("apps.label")}
                  </Label>
                  <Input
                    value={app.label}
                    placeholder={t("apps.label")}
                    onChange={(e) => updateApp(app.id, { label: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("apps.port")}
                  </Label>
                  <Select
                    value={app.port || AUTO}
                    onValueChange={(v) =>
                      updateApp(app.id, { port: v === AUTO ? "" : v })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO}>{t("apps.auto")}</SelectItem>
                      {portOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 mb-0.5 text-red-600 hover:text-red-700"
                  onClick={() => removeApp(app.id)}
                  title={t("apps.remove")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}

          <Button variant="outline" size="sm" onClick={addApp}>
            <Plus className="w-4 h-4 mr-2" />
            {t("apps.add")}
          </Button>
        </CardContent>
      </Card>

      {/* Actions → messages */}
      {ACTION_GROUPS.map((group) => {
        const actions = MIDI_ACTIONS.filter((a) => a.group === group);
        if (actions.length === 0) return null;
        return (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-lg">{t(`groups.${group}`)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {actions.map((action) => {
                const messages = getMessages(action.id);
                return (
                  <div key={action.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">
                        {t(`actions.${action.labelKey}`)}
                      </div>
                      {actionSupportsOffset(action) && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">
                            {t("offset.label")}
                          </Label>
                          <Input
                            type="number"
                            step={50}
                            value={getActionOffsetMs(data, action.id)}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10);
                              updateOffset(action.id, Number.isNaN(n) ? 0 : n);
                            }}
                            className="h-8 w-24 text-xs"
                            title={t("offset.hint")}
                          />
                        </div>
                      )}
                    </div>
                    {messages.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1">
                        {t("message.none")}
                      </p>
                    ) : (
                      messages.map((msg, index) => (
                        <MidiMessageRow
                          key={index}
                          message={msg}
                          apps={data.apps}
                          onChange={(patch) =>
                            updateMessages(action.id, (msgs) =>
                              msgs.map((m, i) => (i === index ? { ...m, ...patch } : m))
                            )
                          }
                          onRemove={() =>
                            updateMessages(action.id, (msgs) =>
                              msgs.filter((_, i) => i !== index)
                            )
                          }
                          onTest={() => testMessage(msg)}
                        />
                      ))
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        updateMessages(action.id, (msgs) => [...msgs, newMessage(data.apps)])
                      }
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {t("message.addMessage")}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={saving} size="sm">
          <Save className="w-4 h-4 mr-2" />
          {saving ? t("saving") : t("save")}
        </Button>
        {saveResult && (
          <span
            className={`text-xs ${saveResult.success ? "text-green-600" : "text-red-600"}`}
          >
            {saveResult.message}
          </span>
        )}
      </div>
    </div>
  );
}
