"use client";

import { useSettings } from "@/lib/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Image, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { apiPost } from "@/lib/utils/ClientFetch";
import { playSound } from "@/lib/utils/audioPlayer";
import type { TitleRevealDefaults } from "@/lib/models/TitleReveal";
import { DEFAULT_TITLE_REVEAL_DEFAULTS } from "@/lib/models/TitleReveal";
import { useState } from "react";

export function TitleRevealDefaultsSettings() {
  const t = useTranslations("settings.titleReveal");
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
    playSound(settings.defaultSoundUrl);
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
