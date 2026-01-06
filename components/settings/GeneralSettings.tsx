"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Loader2, MonitorPlay, MessageSquare } from "lucide-react";
import { apiGet, apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";

interface GeneralSettingsResponse {
  settings?: {
    defaultPosterDisplayMode?: string;
    posterChatMessageEnabled?: boolean;
    guestChatMessageEnabled?: boolean;
  };
}

interface SaveResponse {
  success: boolean;
  error?: string;
}

/**
 * General UI settings
 */
export function GeneralSettings() {
  const t = useTranslations("settings.general");
  const tChatMessage = useTranslations("settings.general.chatMessage");
  const [defaultDisplayMode, setDefaultDisplayMode] = useState<string>("left");
  const [posterChatMessageEnabled, setPosterChatMessageEnabled] = useState(false);
  const [guestChatMessageEnabled, setGuestChatMessageEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await apiGet<GeneralSettingsResponse>("/api/settings/general");
      setDefaultDisplayMode(data.settings?.defaultPosterDisplayMode || "left");
      setPosterChatMessageEnabled(data.settings?.posterChatMessageEnabled || false);
      setGuestChatMessageEnabled(data.settings?.guestChatMessageEnabled || false);
    } catch (error) {
      console.error("Failed to load general settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);

    try {
      const data = await apiPost<SaveResponse>("/api/settings/general", {
        defaultPosterDisplayMode: defaultDisplayMode,
        posterChatMessageEnabled,
        guestChatMessageEnabled,
      });

      if (data.success) {
        setSaveResult({
          success: true,
          message: t("settingsSaved"),
        });
      } else {
        setSaveResult({
          success: false,
          message: data.error || t("saveFailed"),
        });
      }
    } catch (error) {
      if (isClientFetchError(error)) {
        setSaveResult({
          success: false,
          message: error.errorMessage,
        });
      } else {
        setSaveResult({
          success: false,
          message: error instanceof Error ? error.message : t("saveFailed"),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Poster Display Mode */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MonitorPlay className="w-4 h-4" />
          <Label className="text-base font-medium">{t("posterDisplayPosition")}</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("posterDisplayDescription")}
        </p>

        <select
          value={defaultDisplayMode}
          onChange={(e) => setDefaultDisplayMode(e.target.value)}
          className="w-full p-2 border rounded bg-background text-foreground border-input"
        >
          <option value="left">{t("leftSide")}</option>
          <option value="right">{t("rightSide")}</option>
          <option value="bigpicture">{t("bigPicture")}</option>
        </select>

        <Alert>
          <AlertDescription className="text-sm">
            <strong>{t("howItWorks")}</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{t("howItWorksClickShow")}</li>
              <li>{t("howItWorksClickHide")}</li>
              <li>{t("howItWorksButtons")}</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>

      {/* Chat Message Settings */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <Label className="text-base font-medium">{tChatMessage("title")}</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          {tChatMessage("description")}
        </p>

        <div className="space-y-4">
          {/* Poster Chat Message Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="posterChatMessage">{tChatMessage("posterEnabled")}</Label>
              <p className="text-sm text-muted-foreground">
                {tChatMessage("posterEnabledDescription")}
              </p>
            </div>
            <Switch
              id="posterChatMessage"
              checked={posterChatMessageEnabled}
              onCheckedChange={setPosterChatMessageEnabled}
            />
          </div>

          {/* Guest Chat Message Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="guestChatMessage">{tChatMessage("guestEnabled")}</Label>
              <p className="text-sm text-muted-foreground">
                {tChatMessage("guestEnabledDescription")}
              </p>
            </div>
            <Switch
              id="guestChatMessage"
              checked={guestChatMessageEnabled}
              onCheckedChange={setGuestChatMessageEnabled}
            />
          </div>
        </div>
      </div>

      {/* Save Result */}
      {saveResult && (
        <Alert variant={saveResult.success ? "default" : "destructive"}>
          <AlertDescription className="flex items-center gap-2">
            {saveResult.success && <CheckCircle2 className="w-4 h-4" />}
            {saveResult.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t("saving")}
          </>
        ) : (
          t("saveSettings")
        )}
      </Button>
    </div>
  );
}
