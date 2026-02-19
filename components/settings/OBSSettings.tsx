"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  TestTube,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { getBackendUrl } from "@/lib/utils/websocket";
import {
  apiGet,
  apiPost,
  apiDelete,
  isClientFetchError,
} from "@/lib/utils/ClientFetch";

interface OBSConfig {
  url: string;
  password: string;
  autoConnect: boolean;
  autoReconnect: boolean;
}

interface OBSSettingsResponse {
  url?: string;
  password?: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  sourceIsDatabase?: boolean;
}

interface OBSStatusResponse {
  connected: boolean;
  currentScene?: string;
}

interface OBSSaveResponse {
  success: boolean;
  error?: string;
  obsVersion?: string;
  obsWebSocketVersion?: string;
}

/**
 * OBS WebSocket connection settings
 */
export function OBSSettings() {
  const t = useTranslations("settings.obs");
  const [config, setConfig] = useState<OBSConfig>({
    url: "ws://localhost:4455",
    password: "",
    autoConnect: true,
    autoReconnect: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sourceIsDatabase, setSourceIsDatabase] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    obsVersion?: string;
  } | null>(null);
  const [currentStatus, setCurrentStatus] = useState<{
    connected: boolean;
    currentScene?: string;
  } | null>(null);

  // Load current configuration
  useEffect(() => {
    loadSettings();
    fetchStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await apiGet<OBSSettingsResponse>("/api/settings/obs");
      setConfig({
        url: data.url || "ws://localhost:4455",
        password: data.password || "",
        autoConnect: data.autoConnect ?? true,
        autoReconnect: data.autoReconnect ?? true,
      });
      setSourceIsDatabase(data.sourceIsDatabase || false);
    } catch (error) {
      console.error("Failed to load OBS settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const data = await apiGet<OBSStatusResponse>(
        `${getBackendUrl()}/api/obs/status`
      );
      setCurrentStatus({
        connected: data.connected,
        currentScene: data.currentScene,
      });
    } catch (error) {
      console.error("Failed to fetch OBS status:", error);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const data = await apiPost<OBSSaveResponse>("/api/settings/obs", {
        url: config.url,
        password: config.password || undefined,
        testOnly: true,
      });

      if (data.success) {
        setTestResult({
          success: true,
          message: "Successfully connected to OBS!",
          obsVersion: `${data.obsVersion} (WebSocket ${data.obsWebSocketVersion})`,
        });
        fetchStatus();
      } else {
        setTestResult({
          success: false,
          message: data.error || "Connection failed",
        });
      }
    } catch (error) {
      if (isClientFetchError(error)) {
        setTestResult({
          success: false,
          message: error.errorMessage,
        });
      } else {
        setTestResult({
          success: false,
          message:
            error instanceof Error ? error.message : "Connection failed",
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);

    try {
      const data = await apiPost<OBSSaveResponse>("/api/settings/obs", {
        url: config.url,
        password: config.password || undefined,
        autoConnect: config.autoConnect,
        autoReconnect: config.autoReconnect,
        testOnly: false,
      });

      if (data.success) {
        setTestResult({
          success: true,
          message: "Settings saved and connected successfully!",
          obsVersion: `${data.obsVersion} (WebSocket ${data.obsWebSocketVersion})`,
        });
        setSourceIsDatabase(true);
        fetchStatus();
      } else {
        setTestResult({
          success: false,
          message: data.error || "Failed to save settings",
        });
      }
    } catch (error) {
      if (isClientFetchError(error)) {
        setTestResult({
          success: false,
          message: error.errorMessage,
        });
      } else {
        setTestResult({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to save settings",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    try {
      await apiPost(`${getBackendUrl()}/api/obs/connect`);
      fetchStatus();
    } catch (error) {
      console.error("Failed to connect to OBS:", error);
      fetchStatus();
    }
  };

  const handleDisconnect = async () => {
    try {
      await apiPost(`${getBackendUrl()}/api/obs/disconnect`);
      fetchStatus();
    } catch (error) {
      console.error("Failed to disconnect from OBS:", error);
      fetchStatus();
    }
  };

  const handleClearSettings = async () => {
    if (!confirm("Clear saved settings and use .env defaults?")) return;

    try {
      await apiDelete("/api/settings/obs");
      await loadSettings();
      setTestResult({
        success: true,
        message: "Settings cleared. Using .env configuration.",
      });
      fetchStatus();
    } catch (error) {
      setTestResult({
        success: false,
        message: "Failed to clear settings",
      });
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

  const isConnected = currentStatus?.connected === true;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Current Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">{t("currentStatus")}:</span>
        {isConnected ? (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {t("connected")}
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {t("disconnected")}
          </Badge>
        )}
        {currentStatus?.currentScene && (
          <span className="text-sm text-muted-foreground">
            {t("scene")}: {currentStatus.currentScene}
          </span>
        )}
        <Badge variant="outline" className="ml-auto">
          {t("source")}: {sourceIsDatabase ? t("database") : t("envFile")}
        </Badge>
        <Button
          onClick={fetchStatus}
          variant="ghost"
          size="icon"
          className="h-6 w-6"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {/* WebSocket URL */}
      <div className="space-y-2">
        <Label htmlFor="obs-url">{t("websocketUrl")}</Label>
        <Input
          id="obs-url"
          type="text"
          placeholder="ws://localhost:4455"
          value={config.url}
          onChange={(e) => setConfig({ ...config, url: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          {t("websocketUrlDefault")}
        </p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="obs-password">{t("password")}</Label>
        <Input
          id="obs-password"
          type={showPassword ? "text" : "password"}
          placeholder={t("passwordPlaceholder")}
          value={config.password}
          onChange={(e) => setConfig({ ...config, password: e.target.value })}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-password"
            checked={showPassword}
            onCheckedChange={(checked) => setShowPassword(checked === true)}
          />
          <label
            htmlFor="show-password"
            className="text-sm cursor-pointer select-none"
          >
            {t("showPassword")}
          </label>
        </div>
        <p className="text-xs text-muted-foreground">{t("passwordHelp")}</p>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="obs-autoConnect" className="cursor-pointer">
            {t("autoConnect")}
          </Label>
          <Switch
            id="obs-autoConnect"
            checked={config.autoConnect}
            onCheckedChange={(checked) =>
              setConfig({ ...config, autoConnect: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="obs-autoReconnect" className="cursor-pointer">
            {t("autoReconnect")}
          </Label>
          <Switch
            id="obs-autoReconnect"
            checked={config.autoReconnect}
            onCheckedChange={(checked) =>
              setConfig({ ...config, autoReconnect: checked })
            }
          />
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <Alert variant={testResult.success ? "default" : "destructive"}>
          <AlertDescription className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <div>
              <div>{testResult.message}</div>
              {testResult.obsVersion && (
                <div className="text-xs mt-1">
                  OBS Version: {testResult.obsVersion}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleTest} disabled={testing || saving}>
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("testing")}
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4 mr-2" />
              {t("testConnection")}
            </>
          )}
        </Button>
        <Button
          onClick={handleSave}
          disabled={testing || saving}
          variant="default"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("saving")}
            </>
          ) : (
            t("saveSettings")
          )}
        </Button>

        {isConnected ? (
          <Button
            onClick={handleDisconnect}
            variant="outline"
            disabled={testing || saving}
          >
            <WifiOff className="w-4 h-4 mr-2" />
            {t("disconnect")}
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            variant="outline"
            disabled={testing || saving}
          >
            <Wifi className="w-4 h-4 mr-2" />
            {t("connect")}
          </Button>
        )}

        {sourceIsDatabase && (
          <Button
            onClick={handleClearSettings}
            variant="outline"
            disabled={testing || saving}
          >
            {t("clearUseEnv")}
          </Button>
        )}
      </div>

      {/* Help */}
      <Alert>
        <AlertDescription className="text-sm space-y-3">
          <div>
            <strong>{t("setupGuide")}</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>{t("setupStep1")}</li>
              <li>{t("setupStep2")}</li>
              <li>{t("setupStep3")}</li>
              <li>{t("setupStep4")}</li>
              <li>{t("setupStep5")}</li>
            </ol>
          </div>
          <div>
            <strong>{t("configPriority")}</strong>
            <p className="mt-1">{t("configPriorityDesc")}</p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
