"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  TestTube,
  RefreshCw,
} from "lucide-react";
import {
  buildStreamerbotUrl,
  parseStreamerbotUrl,
} from "@/lib/utils/streamerbotUrl";
import { getBackendUrl } from "@/lib/utils/websocket";
import { apiGet, apiPut, apiPost, apiDelete, isClientFetchError } from "@/lib/utils/ClientFetch";

interface StreamerbotSettingsResponse {
  host: string;
  port: number;
  endpoint: string;
  scheme: "ws" | "wss";
  autoConnect: boolean;
  autoReconnect?: boolean;
  hasPassword: boolean;
}

interface StreamerbotStatusResponse {
  status: "connected" | "disconnected" | "connecting" | "error";
  error?: {
    message?: string;
  };
}

interface StreamerbotConfig {
  url: string;
  password: string;
  autoConnect: boolean;
  autoReconnect: boolean;
}

/**
 * Settings page component for managing global Streamer.bot connection settings.
 * Normalized layout matching OBS settings screen.
 */
export function StreamerbotSettings() {
  const t = useTranslations("settings.streamerbot");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [config, setConfig] = useState<StreamerbotConfig>({
    url: "ws://127.0.0.1:8080/",
    password: "",
    autoConnect: true,
    autoReconnect: true,
  });
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<StreamerbotStatusResponse | null>(null);

  // Load current settings and status on mount
  useEffect(() => {
    loadSettings();
    fetchStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const backendUrl = getBackendUrl();
      const data = await apiGet<StreamerbotSettingsResponse>(
        `${backendUrl}/api/streamerbot-chat/settings`
      );

      setConfig({
        url: buildStreamerbotUrl({
          host: data.host,
          port: data.port,
          endpoint: data.endpoint,
          scheme: data.scheme,
        }),
        password: "",
        autoConnect: data.autoConnect ?? true,
        autoReconnect: data.autoReconnect ?? true,
      });
    } catch (error) {
      console.error("Failed to load Streamer.bot settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const backendUrl = getBackendUrl();
      const status = await apiGet<StreamerbotStatusResponse>(
        `${backendUrl}/api/streamerbot-chat/status`
      );
      setConnectionStatus(status);
    } catch (error) {
      console.error("Failed to fetch Streamer.bot status:", error);
      setConnectionStatus({
        status: "error",
        error: { message: "Unable to check status" },
      });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const backendUrl = getBackendUrl();
      const parts = parseStreamerbotUrl(config.url);

      // Save settings temporarily for testing
      await apiPut(`${backendUrl}/api/streamerbot-chat/settings`, {
        ...parts,
        password: config.password || undefined,
        autoConnect: config.autoConnect,
        autoReconnect: config.autoReconnect,
      });

      // Try to connect
      await apiPost(`${backendUrl}/api/streamerbot-chat/connect`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check status
      const status = await apiGet<StreamerbotStatusResponse>(
        `${backendUrl}/api/streamerbot-chat/status`
      );

      if (status.status === "connected") {
        setTestResult({
          success: true,
          message: `Connected to ${parts.host}:${parts.port}`,
        });
        // Disconnect after successful test
        await apiPost(`${backendUrl}/api/streamerbot-chat/disconnect`);
      } else {
        setTestResult({
          success: false,
          message:
            status.error?.message ||
            `Failed to connect to ${parts.host}:${parts.port}`,
        });
      }
    } catch (error) {
      const message = isClientFetchError(error)
        ? error.errorMessage
        : error instanceof Error
          ? error.message
          : "Connection failed";
      setTestResult({ success: false, message });
    } finally {
      setTesting(false);
      fetchStatus();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);

    try {
      const backendUrl = getBackendUrl();
      const parts = parseStreamerbotUrl(config.url);

      await apiPut(`${backendUrl}/api/streamerbot-chat/settings`, {
        ...parts,
        password: config.password || undefined,
        autoConnect: config.autoConnect,
        autoReconnect: config.autoReconnect,
      });

      setTestResult({
        success: true,
        message: t("saveSuccess"),
      });
      fetchStatus();
    } catch (error) {
      const message = isClientFetchError(error)
        ? error.errorMessage
        : error instanceof Error
          ? error.message
          : t("saveFailed");
      setTestResult({ success: false, message });
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    try {
      const backendUrl = getBackendUrl();
      await apiPost(`${backendUrl}/api/streamerbot-chat/connect`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      fetchStatus();
    } catch (error) {
      console.error("Failed to connect:", error);
      fetchStatus();
    }
  };

  const handleDisconnect = async () => {
    try {
      const backendUrl = getBackendUrl();
      await apiPost(`${backendUrl}/api/streamerbot-chat/disconnect`);
      fetchStatus();
    } catch (error) {
      console.error("Failed to disconnect:", error);
      fetchStatus();
    }
  };

  const handleClear = async () => {
    try {
      const backendUrl = getBackendUrl();
      await apiDelete(`${backendUrl}/api/streamerbot-chat/settings`);
      await loadSettings();
      setTestResult({
        success: true,
        message: t("settingsCleared"),
      });
      fetchStatus();
    } catch (error) {
      setTestResult({
        success: false,
        message: t("saveFailed"),
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

  const isConnected = connectionStatus?.status === "connected";
  const isConnecting = connectionStatus?.status === "connecting";

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
        ) : isConnecting ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t("connecting")}
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {t("disconnected")}
          </Badge>
        )}
        <Badge variant="outline" className="ml-auto">
          {t("source")}: {t("database")}
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
        <Label htmlFor="sb-url">{t("websocketUrl")}</Label>
        <Input
          id="sb-url"
          type="text"
          placeholder="ws://127.0.0.1:8080/"
          value={config.url}
          onChange={(e) => setConfig({ ...config, url: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          {t("websocketUrlDefault")}
        </p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="sb-password">{t("password")}</Label>
        <Input
          id="sb-password"
          type={showPassword ? "text" : "password"}
          placeholder={t("passwordPlaceholder")}
          value={config.password}
          onChange={(e) => setConfig({ ...config, password: e.target.value })}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="sb-show-password"
            checked={showPassword}
            onCheckedChange={(checked) => setShowPassword(checked === true)}
          />
          <label
            htmlFor="sb-show-password"
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
          <Label htmlFor="sb-autoConnect" className="cursor-pointer">
            {t("autoConnect")}
          </Label>
          <Switch
            id="sb-autoConnect"
            checked={config.autoConnect}
            onCheckedChange={(checked) =>
              setConfig({ ...config, autoConnect: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="sb-autoReconnect" className="cursor-pointer">
            {t("autoReconnect")}
          </Label>
          <Switch
            id="sb-autoReconnect"
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
            {testResult.message}
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
            disabled={saving || testing}
          >
            <WifiOff className="w-4 h-4 mr-2" />
            {t("disconnect")}
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            variant="outline"
            disabled={saving || testing || isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4 mr-2" />
            )}
            {t("connect")}
          </Button>
        )}

        <Button
          onClick={handleClear}
          variant="outline"
          disabled={testing || saving}
        >
          {t("clearSettings")}
        </Button>
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
            </ol>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
