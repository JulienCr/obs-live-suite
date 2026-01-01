"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, MonitorPlay } from "lucide-react";

/**
 * General UI settings
 */
export function GeneralSettings() {
  const t = useTranslations("settings.general");
  const [defaultDisplayMode, setDefaultDisplayMode] = useState<string>("left");
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
      const res = await fetch("/api/settings/general");
      const data = await res.json();
      setDefaultDisplayMode(data.settings?.defaultPosterDisplayMode || "left");
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
      const res = await fetch("/api/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPosterDisplayMode: defaultDisplayMode }),
      });

      const data = await res.json();

      if (data.success) {
        setSaveResult({
          success: true,
          message: "Settings saved successfully!",
        });
      } else {
        setSaveResult({
          success: false,
          message: data.error || "Failed to save settings",
        });
      }
    } catch (error) {
      setSaveResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to save settings",
      });
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
