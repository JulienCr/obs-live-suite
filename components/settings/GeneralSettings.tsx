"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Loader2, MonitorPlay, MessageSquare } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";

interface GeneralSettingsState {
  defaultPosterDisplayMode: string;
  posterChatMessageEnabled: boolean;
  guestChatMessageEnabled: boolean;
}

interface GeneralSettingsResponse {
  settings?: Partial<GeneralSettingsState>;
}

const INITIAL_STATE: GeneralSettingsState = {
  defaultPosterDisplayMode: "left",
  posterChatMessageEnabled: false,
  guestChatMessageEnabled: false,
};

/**
 * General UI settings
 */
export function GeneralSettings() {
  const t = useTranslations("settings.general");
  const tChatMessage = useTranslations("settings.general.chatMessage");

  const { data: settings, setData: setSettings, loading, saving, saveResult, save } = useSettings<
    GeneralSettingsResponse,
    GeneralSettingsState
  >({
    endpoint: "/api/settings/general",
    initialState: INITIAL_STATE,
    fromResponse: (res) => ({
      defaultPosterDisplayMode: res.settings?.defaultPosterDisplayMode || "left",
      posterChatMessageEnabled: res.settings?.posterChatMessageEnabled || false,
      guestChatMessageEnabled: res.settings?.guestChatMessageEnabled || false,
    }),
    successMessage: t("settingsSaved"),
    errorMessage: t("saveFailed"),
  });

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
          value={settings.defaultPosterDisplayMode}
          onChange={(e) => setSettings((prev) => ({ ...prev, defaultPosterDisplayMode: e.target.value }))}
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
              checked={settings.posterChatMessageEnabled}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, posterChatMessageEnabled: checked }))}
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
              checked={settings.guestChatMessageEnabled}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, guestChatMessageEnabled: checked }))}
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
      <Button onClick={save} disabled={saving}>
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
