"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, Loader2, Monitor, Send } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";
import { apiGet, apiPost } from "@/lib/utils/ClientFetch";
import { CueSeverity, CueType, CueFrom } from "@/lib/models/Cue";
import type { MonitorInfo } from "@/lib/models/StudioReturn";
import { DEFAULT_STUDIO_RETURN_SETTINGS } from "@/lib/models/StudioReturn";

interface StudioReturnSettingsState {
  monitorIndex: number;
  displayDuration: number;
  fontSize: number;
  enabled: boolean;
}

interface StudioReturnSettingsResponse {
  settings?: Partial<StudioReturnSettingsState>;
}

const INITIAL_STATE: StudioReturnSettingsState = DEFAULT_STUDIO_RETURN_SETTINGS;

export function StudioReturnSettings() {
  const t = useTranslations("settings.studioReturn");
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);

  const { data: settings, setData: setSettings, loading, saving, saveResult, save } = useSettings<
    StudioReturnSettingsResponse,
    StudioReturnSettingsState
  >({
    endpoint: "/api/settings/studio-return",
    initialState: INITIAL_STATE,
    fromResponse: (res) => ({
      monitorIndex: res.settings?.monitorIndex ?? INITIAL_STATE.monitorIndex,
      displayDuration: res.settings?.displayDuration ?? INITIAL_STATE.displayDuration,
      fontSize: res.settings?.fontSize ?? INITIAL_STATE.fontSize,
      enabled: res.settings?.enabled ?? INITIAL_STATE.enabled,
    }),
    successMessage: t("settingsSaved"),
    errorMessage: t("saveFailed"),
  });

  // Fetch available monitors
  useEffect(() => {
    const fetchMonitors = async () => {
      try {
        const data = await apiGet<{ monitors: MonitorInfo[] }>("/api/settings/studio-return/monitors");
        setMonitors(data.monitors || []);
      } catch {
        // Monitors not available yet (Tauri app not running)
      }
    };

    fetchMonitors();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchMonitors();
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

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

      {/* Enabled toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="studioReturnEnabled">{t("enabled")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("enabledDescription")}
          </p>
        </div>
        <Switch
          id="studioReturnEnabled"
          checked={settings.enabled}
          onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enabled: checked }))}
        />
      </div>

      {/* Monitor selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4" />
          <Label className="text-base font-medium">{t("monitor")}</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("monitorDescription")}
        </p>

        {monitors.length > 0 ? (
          <select
            value={settings.monitorIndex}
            onChange={(e) => setSettings((prev) => ({ ...prev, monitorIndex: parseInt(e.target.value, 10) }))}
            className="w-full p-2 border rounded bg-background text-foreground border-input"
          >
            {monitors.map((m) => (
              <option key={m.index} value={m.index}>
                {m.name || `Monitor ${m.index + 1}`} — {m.width}x{m.height}
                {m.isPrimary ? ` (${t("primary")})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <Alert>
            <AlertDescription className="text-sm">
              {t("noMonitors")}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Display duration */}
      <div className="space-y-3">
        <Label className="text-base font-medium">{t("displayDuration")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("displayDurationDescription")}
        </p>
        <div className="flex items-center gap-4">
          <Slider
            value={[settings.displayDuration]}
            onValueChange={([val]) => setSettings((prev) => ({ ...prev, displayDuration: val }))}
            min={3}
            max={60}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-mono w-12 text-right">{settings.displayDuration}s</span>
        </div>
      </div>

      {/* Font size */}
      <div className="space-y-3">
        <Label className="text-base font-medium">{t("fontSize")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("fontSizeDescription")}
        </p>
        <div className="flex items-center gap-4">
          <Slider
            value={[settings.fontSize]}
            onValueChange={([val]) => setSettings((prev) => ({ ...prev, fontSize: val }))}
            min={32}
            max={160}
            step={4}
            className="flex-1"
          />
          <span className="text-sm font-mono w-14 text-right">{settings.fontSize}px</span>
        </div>
      </div>

      {/* Test notification */}
      <div className="space-y-3 pt-4 border-t">
        <Label className="text-base font-medium">{t("testNotification")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("testNotificationDescription")}
        </p>
        <div className="flex gap-2">
          <TestButton severity={CueSeverity.INFO} label="Info" />
          <TestButton severity={CueSeverity.WARN} label="Warn" />
          <TestButton severity={CueSeverity.URGENT} label="Urgent" />
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

const SEVERITY_COLORS: Record<CueSeverity, string> = {
  [CueSeverity.INFO]: "bg-blue-600 hover:bg-blue-700",
  [CueSeverity.WARN]: "bg-amber-500 hover:bg-amber-600",
  [CueSeverity.URGENT]: "bg-red-600 hover:bg-red-700",
};

function TestButton({ severity, label }: { severity: CueSeverity; label: string }) {
  const [sending, setSending] = useState(false);

  const sendTest = useCallback(async () => {
    setSending(true);
    try {
      await apiPost("/api/presenter/cue/send", {
        type: CueType.CUE,
        from: CueFrom.CONTROL,
        severity,
        title: "TEST",
        body: `Test ${label} — Studio Return`,
        studioReturn: true,
      });
    } catch (e) {
      console.error("Failed to send test cue:", e);
    } finally {
      setSending(false);
    }
  }, [severity, label]);

  return (
    <Button
      onClick={sendTest}
      disabled={sending}
      className={`${SEVERITY_COLORS[severity]} text-white`}
      size="sm"
    >
      <Send className="w-3 h-3 mr-1" />
      {label}
    </Button>
  );
}
