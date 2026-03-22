"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TitleRevealLineEditor } from "./TitleRevealLineEditor";
import { FontFamilyCombobox } from "./FontFamilyCombobox";
import { FontSizeCombobox } from "./FontSizeCombobox";
import type { TitleReveal, TitleRevealLine } from "@/lib/queries/useTitleReveals";
import type { TitleRevealAnimConfig } from "@/lib/titleReveal";


export type TitleRevealSaveData = {
  name: string;
  lines: TitleRevealLine[];
  logoUrl: string | null;
  fontFamily: string;
  fontSize: number;
  rotation: number;
  colorText: string;
  colorGhostBlue: string;
  colorGhostNavy: string;
  duration: number;
  soundUrl: string | null;
  midiEnabled: boolean;
  midiChannel: number;
  midiCc: number;
  midiValue: number;
};

interface TitleRevealEditorProps {
  initial: TitleReveal | null;
  onSave: (data: TitleRevealSaveData) => void;
  onCancel: () => void;
  uploadLogo: (file: File) => Promise<string>;
  uploadSound: (file: File) => Promise<string>;
  onConfigChange?: (config: TitleRevealAnimConfig) => void;
}

const DEFAULT_LINE: TitleRevealLine = {
  text: "",
  fontSize: 80,
  alignment: "l",
  offsetX: 0,
  offsetY: 0,
};

export function TitleRevealEditor({ initial, onSave, onCancel, uploadLogo, uploadSound, onConfigChange }: TitleRevealEditorProps) {
  const t = useTranslations("dashboard.titleReveal");

  const [name, setName] = useState(initial?.name ?? "");
  const [lines, setLines] = useState<TitleRevealLine[]>(
    initial?.lines ?? [{ ...DEFAULT_LINE }]
  );
  const [fontFamily, setFontFamily] = useState(initial?.fontFamily ?? "Permanent Marker");
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? 80);
  const [rotation, setRotation] = useState(initial?.rotation ?? -5);
  const [duration, setDuration] = useState(initial?.duration ?? 8.5);
  const [colorText, setColorText] = useState(initial?.colorText ?? "#F5A623");
  const [colorGhostBlue, setColorGhostBlue] = useState(initial?.colorGhostBlue ?? "#7B8DB5");
  const [colorGhostNavy, setColorGhostNavy] = useState(initial?.colorGhostNavy ?? "#1B2A6B");
  const [logoUrl, setLogoUrl] = useState<string | null>(initial?.logoUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [soundUrl, setSoundUrl] = useState<string | null>(initial?.soundUrl ?? null);
  const [isSoundUploading, setIsSoundUploading] = useState(false);
  const [midiEnabled, setMidiEnabled] = useState(initial?.midiEnabled ?? false);
  const [midiChannel, setMidiChannel] = useState(initial?.midiChannel ?? 1);
  const [midiCc, setMidiCc] = useState(initial?.midiCc ?? 60);
  const [midiValue, setMidiValue] = useState(initial?.midiValue ?? 127);

  // Expose current config to parent for the side preview
  const previewConfig = useMemo<TitleRevealAnimConfig>(
    () => ({ lines, fontFamily, fontSize, rotation, duration, colorText, colorGhostBlue, colorGhostNavy, logoUrl }),
    [lines, fontFamily, fontSize, rotation, duration, colorText, colorGhostBlue, colorGhostNavy, logoUrl]
  );
  useEffect(() => { onConfigChange?.(previewConfig); }, [previewConfig, onConfigChange]);

  const handleLineChange = useCallback((index: number, updated: TitleRevealLine) => {
    setLines((prev) => prev.map((l, i) => (i === index ? updated : l)));
  }, []);

  const handleAddLine = () => {
    setLines((prev) => [...prev, { ...DEFAULT_LINE }]);
  };

  const handleRemoveLine = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadLogo(file);
      setLogoUrl(url);
    } catch (error) {
      console.error("Failed to upload logo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSoundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSoundUploading(true);
    try {
      const url = await uploadSound(file);
      setSoundUrl(url);
    } catch (error) {
      console.error("Failed to upload sound:", error);
    } finally {
      setIsSoundUploading(false);
    }
  };

  const handleTestSound = () => {
    if (!soundUrl) return;
    const audio = new Audio(soundUrl);
    audio.play().catch(() => {});
  };

  const handleSave = () => {
    if (!name.trim() || lines.length === 0) return;
    onSave({
      name: name.trim(),
      lines,
      logoUrl,
      fontFamily,
      fontSize,
      rotation,
      colorText,
      colorGhostBlue,
      colorGhostNavy,
      duration,
      soundUrl,
      midiEnabled,
      midiChannel,
      midiCc,
      midiValue,
    });
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="tr-name">{t("name")}</Label>
        <Input
          id="tr-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
        />
      </div>

      {/* Lines */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("lines")}</Label>
          <Button variant="ghost" size="sm" onClick={handleAddLine}>
            <Plus className="h-4 w-4 mr-1" />
            {t("addLine")}
          </Button>
        </div>
        {lines.map((line, index) => (
          <TitleRevealLineEditor
            key={index}
            line={line}
            index={index}
            onChange={handleLineChange}
            onRemove={handleRemoveLine}
            canRemove={lines.length > 1}
          />
        ))}
      </div>

      {/* Global Settings */}
      <div className="space-y-3 border-t pt-3">
        <Label className="text-sm font-semibold">{t("globalSettings")}</Label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("fontFamily")}</Label>
            <FontFamilyCombobox
              value={fontFamily}
              onChange={setFontFamily}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("fontSize")}</Label>
            <FontSizeCombobox
              value={fontSize}
              onChange={setFontSize}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("rotation")}: {rotation}°</Label>
          <Slider
            min={-45}
            max={45}
            step={1}
            value={[rotation]}
            onValueChange={([v]) => setRotation(v)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tr-duration">{t("duration")}</Label>
          <Input
            id="tr-duration"
            type="number"
            min={1}
            max={60}
            step={0.5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tr-colorText">{t("colorText")}</Label>
            <input
              id="tr-colorText"
              type="color"
              value={colorText}
              onChange={(e) => setColorText(e.target.value)}
              className="h-9 w-full cursor-pointer rounded border border-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr-colorGhostBlue">{t("colorGhostBlue")}</Label>
            <input
              id="tr-colorGhostBlue"
              type="color"
              value={colorGhostBlue}
              onChange={(e) => setColorGhostBlue(e.target.value)}
              className="h-9 w-full cursor-pointer rounded border border-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr-colorGhostNavy">{t("colorGhostNavy")}</Label>
            <input
              id="tr-colorGhostNavy"
              type="color"
              value={colorGhostNavy}
              onChange={(e) => setColorGhostNavy(e.target.value)}
              className="h-9 w-full cursor-pointer rounded border border-input"
            />
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-1.5">
          <Label>{t("logo")}</Label>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                {isUploading ? "..." : t("uploadLogo")}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded object-contain" />}
            {logoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLogoUrl(null)}
              >
                {t("removeLogo")}
              </Button>
            )}
          </div>
        </div>
        {/* Sound */}
        <div className="space-y-1.5">
          <Label>{t("sound")}</Label>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                {isSoundUploading ? "..." : t("uploadSound")}
              </span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleSoundUpload}
                className="hidden"
                disabled={isSoundUploading}
              />
            </label>
            {soundUrl && (
              <>
                <Button variant="ghost" size="sm" onClick={handleTestSound}>
                  <Volume2 className="h-4 w-4 mr-1" />
                  {t("testSound")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSoundUrl(null)}>
                  {t("removeSound")}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* MIDI */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch checked={midiEnabled} onCheckedChange={setMidiEnabled} />
            <Label>{t("midiEnabled")}</Label>
          </div>
          {midiEnabled && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t("midiChannel")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={16}
                  value={midiChannel}
                  onChange={(e) => setMidiChannel(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("midiCc")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={127}
                  value={midiCc}
                  onChange={(e) => setMidiCc(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("midiValue")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={127}
                  value={midiValue}
                  onChange={(e) => setMidiValue(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={!name.trim() || lines.length === 0 || lines.every((l) => !l.text.trim())}
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
