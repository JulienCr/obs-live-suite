"use client";

import { useSettings } from "@/lib/hooks/useSettings";
import { useMidi } from "@/hooks/useMidi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Image, Volume2, Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiPost } from "@/lib/utils/ClientFetch";
import type { TitleRevealDefaults } from "@/lib/models/TitleReveal";
import { DEFAULT_TITLE_REVEAL_DEFAULTS } from "@/lib/models/TitleReveal";
import { useState } from "react";

export function TitleRevealDefaultsSettings() {
  const t = useTranslations("settings.titleReveal");
  const { available: midiAvailable, sendCC } = useMidi();
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isSoundUploading, setIsSoundUploading] = useState(false);

  const { data: settings, setData: setSettings, loading, saving, saveResult, save } =
    useSettings<{ settings: TitleRevealDefaults }, TitleRevealDefaults>({
      endpoint: "/api/settings/title-reveal-defaults",
      initialState: DEFAULT_TITLE_REVEAL_DEFAULTS,
      fromResponse: (res) => res.settings ?? DEFAULT_TITLE_REVEAL_DEFAULTS,
      saveMethod: "POST",
      successMessage: t("savedSuccess"),
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiPost<{ url: string }>(
        "/api/assets/title-reveals/upload-logo",
        formData
      );
      setSettings((prev) => ({ ...prev, defaultLogoUrl: response.url }));
    } catch (error) {
      console.error("Failed to upload logo:", error);
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleSoundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSoundUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiPost<{ url: string }>(
        "/api/assets/title-reveals/upload-sound",
        formData
      );
      setSettings((prev) => ({ ...prev, defaultSoundUrl: response.url }));
    } catch (error) {
      console.error("Failed to upload sound:", error);
    } finally {
      setIsSoundUploading(false);
    }
  };

  const handleTestSound = () => {
    if (!settings.defaultSoundUrl) return;
    const audio = new Audio(settings.defaultSoundUrl);
    audio.play().catch(() => {});
  };

  const handleTestMidi = () => {
    if (!settings.midiEnabled) return;
    sendCC("", {
      channel: settings.midiChannel,
      cc: settings.midiCc,
      value: settings.midiValue,
    });
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Default Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="w-5 h-5" />
            {t("defaultLogo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("defaultLogoDesc")}</p>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                {isLogoUploading ? "..." : t("uploadLogo")}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={isLogoUploading}
              />
            </label>
            {settings.defaultLogoUrl && (
              <>
                <img
                  src={settings.defaultLogoUrl}
                  alt="Default logo"
                  className="h-10 w-10 rounded object-contain border"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettings((prev) => ({ ...prev, defaultLogoUrl: null }))}
                >
                  {t("remove")}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Default Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {t("defaultDuration")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("defaultDurationDesc")}</p>
          <Input
            type="number"
            min={1}
            max={60}
            step={0.5}
            value={settings.defaultDuration}
            onChange={(e) => setSettings((prev) => ({ ...prev, defaultDuration: Number(e.target.value) }))}
            className="w-32"
          />
        </CardContent>
      </Card>

      {/* Default Sound */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="w-5 h-5" />
            {t("defaultSound")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("defaultSoundDesc")}</p>
          <div className="flex items-center gap-3">
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
            {settings.defaultSoundUrl && (
              <>
                <Button variant="ghost" size="sm" onClick={handleTestSound}>
                  <Volume2 className="h-4 w-4 mr-1" />
                  {t("testSound")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettings((prev) => ({ ...prev, defaultSoundUrl: null }))}
                >
                  {t("remove")}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Default MIDI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="w-5 h-5" />
            {t("defaultMidi")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("defaultMidiDesc")}</p>

          {!midiAvailable && (
            <p className="text-xs text-muted-foreground">{t("midiNotAvailable")}</p>
          )}

          <div className="flex items-center gap-2">
            <Switch
              checked={settings.midiEnabled}
              onCheckedChange={(v) => setSettings((prev) => ({ ...prev, midiEnabled: v }))}
            />
            <Label>{t("midiEnabled")}</Label>
          </div>

          {settings.midiEnabled && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t("midiChannel")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={16}
                  value={settings.midiChannel}
                  onChange={(e) => setSettings((prev) => ({ ...prev, midiChannel: Math.max(1, Math.min(16, parseInt(e.target.value) || 1)) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("midiCc")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={127}
                  value={settings.midiCc}
                  onChange={(e) => setSettings((prev) => ({ ...prev, midiCc: Math.max(0, Math.min(127, parseInt(e.target.value) || 0)) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("midiValue")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={127}
                  value={settings.midiValue}
                  onChange={(e) => setSettings((prev) => ({ ...prev, midiValue: Math.max(0, Math.min(127, parseInt(e.target.value) || 0)) }))}
                />
              </div>
            </div>
          )}

          {settings.midiEnabled && (
            <Button variant="outline" size="sm" onClick={handleTestMidi}>
              <Volume2 className="h-4 w-4 mr-1" />
              {t("testMidi")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-2">
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
    </div>
  );
}
