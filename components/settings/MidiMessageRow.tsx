"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volume2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MidiApp, MidiMessage } from "@/lib/models/Midi";

const clamp = (raw: string, min: number, max: number, fallback: number) =>
  Math.max(min, Math.min(max, parseInt(raw, 10) || fallback));

/**
 * One MIDI message row: target application + CC (channel / cc / value), an
 * enabled switch, a test button and a remove button. Shared by all actions in
 * the centralized MIDI settings.
 */
export function MidiMessageRow({
  message,
  apps,
  onChange,
  onRemove,
  onTest,
}: {
  message: MidiMessage;
  apps: MidiApp[];
  onChange: (patch: Partial<MidiMessage>) => void;
  onRemove: () => void;
  onTest: () => void;
}) {
  const t = useTranslations("midi.message");

  return (
    <div className="flex items-end gap-3 py-2 border-b last:border-0">
      <Switch
        className="mb-2"
        checked={message.enabled}
        onCheckedChange={(v) => onChange({ enabled: v })}
      />

      <div className="flex-1 min-w-0 space-y-1">
        <Label className="text-xs text-muted-foreground">{t("app")}</Label>
        <Select value={message.appId} onValueChange={(v) => onChange({ appId: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={t("noApp")} />
          </SelectTrigger>
          <SelectContent>
            {apps.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.label || app.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1 w-16">
        <Label className="text-xs text-muted-foreground">{t("channel")}</Label>
        <Input
          type="number"
          min={1}
          max={16}
          value={message.channel}
          onChange={(e) => onChange({ channel: clamp(e.target.value, 1, 16, 1) })}
          disabled={!message.enabled}
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-1 w-16">
        <Label className="text-xs text-muted-foreground">{t("cc")}</Label>
        <Input
          type="number"
          min={0}
          max={127}
          value={message.cc}
          onChange={(e) => onChange({ cc: clamp(e.target.value, 0, 127, 0) })}
          disabled={!message.enabled}
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-1 w-16">
        <Label className="text-xs text-muted-foreground">{t("value")}</Label>
        <Input
          type="number"
          min={0}
          max={127}
          value={message.value}
          onChange={(e) => onChange({ value: clamp(e.target.value, 0, 127, 0) })}
          disabled={!message.enabled}
          className="h-8 text-xs"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 mb-0.5"
        disabled={!message.enabled}
        onClick={onTest}
        title={t("test")}
      >
        <Volume2 className="w-3.5 h-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 mb-0.5 text-red-600 hover:text-red-700"
        onClick={onRemove}
        title={t("remove")}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
