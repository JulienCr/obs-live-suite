"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, Plus, Trash2, Save } from "lucide-react";
import { apiGet, apiPut, isClientFetchError } from "@/lib/utils/ClientFetch";
import type { PresenterChannelSettings as PresenterChannelSettingsType } from "@/lib/models/PresenterChannel";
import { DEFAULT_QUICK_REPLIES } from "@/lib/models/PresenterChannel";

const MAX_QUICK_REPLIES = 6;

/**
 * Presenter channel settings component
 * Replaces the multi-room RoomSettings with a single-form settings panel
 */
export function PresenterChannelSettings() {
  const t = useTranslations("settings.presenterChannel");
  const [settings, setSettings] = useState<PresenterChannelSettingsType>({
    vdoNinjaUrl: undefined,
    quickReplies: [...DEFAULT_QUICK_REPLIES],
    canSendCustomMessages: false,
    allowPresenterToSendMessage: false,
  });
  const [newQuickReply, setNewQuickReply] = useState("");
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
      const data = await apiGet<PresenterChannelSettingsType>("/api/presenter/settings");
      setSettings({
        vdoNinjaUrl: data.vdoNinjaUrl,
        quickReplies: data.quickReplies || [...DEFAULT_QUICK_REPLIES],
        canSendCustomMessages: data.canSendCustomMessages ?? false,
        allowPresenterToSendMessage: data.allowPresenterToSendMessage ?? false,
      });
    } catch (error) {
      console.error("Failed to load presenter settings:", error);
      setSaveResult({
        success: false,
        message: t("failedToLoad"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);

    try {
      await apiPut<PresenterChannelSettingsType>("/api/presenter/settings", {
        vdoNinjaUrl: settings.vdoNinjaUrl || undefined,
        quickReplies: settings.quickReplies,
        canSendCustomMessages: settings.canSendCustomMessages,
        allowPresenterToSendMessage: settings.allowPresenterToSendMessage,
      });

      setSaveResult({
        success: true,
        message: t("settingsSaved"),
      });
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

  const addQuickReply = () => {
    const trimmed = newQuickReply.trim();
    if (
      trimmed &&
      !settings.quickReplies.includes(trimmed) &&
      settings.quickReplies.length < MAX_QUICK_REPLIES
    ) {
      setSettings({
        ...settings,
        quickReplies: [...settings.quickReplies, trimmed],
      });
      setNewQuickReply("");
    }
  };

  const removeQuickReply = (index: number) => {
    setSettings({
      ...settings,
      quickReplies: settings.quickReplies.filter((_, i) => i !== index),
    });
  };

  const updateQuickReply = (index: number, value: string) => {
    const updated = [...settings.quickReplies];
    updated[index] = value;
    setSettings({
      ...settings,
      quickReplies: updated,
    });
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* VDO.Ninja URL */}
      <div className="space-y-2">
        <Label htmlFor="vdoNinjaUrl">{t("vdoNinjaUrl")}</Label>
        <Input
          id="vdoNinjaUrl"
          type="url"
          value={settings.vdoNinjaUrl || ""}
          onChange={(e) =>
            setSettings({ ...settings, vdoNinjaUrl: e.target.value || undefined })
          }
          placeholder={t("vdoNinjaUrlPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">{t("vdoNinjaUrlHelp")}</p>
      </div>

      {/* Quick Replies */}
      <div className="space-y-2">
        <Label>{t("quickReplies")}</Label>
        <p className="text-xs text-muted-foreground mb-2">
          {t("quickRepliesHelp", { max: MAX_QUICK_REPLIES })}
        </p>

        {/* Existing quick replies as editable inputs */}
        <div className="space-y-2">
          {settings.quickReplies.map((reply, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={reply}
                onChange={(e) => updateQuickReply(index, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeQuickReply(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add new quick reply */}
        {settings.quickReplies.length < MAX_QUICK_REPLIES && (
          <div className="flex items-center gap-2">
            <Input
              value={newQuickReply}
              onChange={(e) => setNewQuickReply(e.target.value)}
              placeholder={t("quickRepliesPlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addQuickReply();
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addQuickReply}
              disabled={!newQuickReply.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {settings.quickReplies.length >= MAX_QUICK_REPLIES && (
          <p className="text-xs text-muted-foreground">
            {t("maxRepliesReached", { max: MAX_QUICK_REPLIES })}
          </p>
        )}
      </div>

      {/* Allow Custom Messages Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="canSendCustomMessages">{t("allowCustomMessages")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("allowCustomMessagesHelp")}
          </p>
        </div>
        <Switch
          id="canSendCustomMessages"
          checked={settings.canSendCustomMessages}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, canSendCustomMessages: checked })
          }
        />
      </div>

      {/* Allow Presenter to Send Chat Messages Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="allowPresenterToSendMessage">
            {t("allowPresenterChat")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("allowPresenterChatHelp")}
          </p>
        </div>
        <Switch
          id="allowPresenterToSendMessage"
          checked={settings.allowPresenterToSendMessage}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, allowPresenterToSendMessage: checked })
          }
        />
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
          <>
            <Save className="w-4 h-4 mr-2" />
            {t("saveSettings")}
          </>
        )}
      </Button>
    </div>
  );
}
