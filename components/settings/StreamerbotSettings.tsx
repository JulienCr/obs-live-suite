"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Wifi, WifiOff, Save, RefreshCw } from "lucide-react";
import { StreamerbotConnectionForm } from "./StreamerbotConnectionForm";
import {
  type StreamerbotConnectionSettings,
  DEFAULT_STREAMERBOT_CONNECTION,
} from "@/lib/models/StreamerbotChat";
import { getBackendUrl } from "@/lib/utils/websocket";
import { apiGet, apiPut, apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";

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

/**
 * Settings page component for managing global Streamer.bot connection settings.
 * Wraps StreamerbotConnectionForm with state management and API integration.
 */
export function StreamerbotSettings() {
  const t = useTranslations("settings.streamerbot");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<StreamerbotConnectionSettings | undefined>(undefined);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<StreamerbotStatusResponse | null>(null);

  // Load current settings and status on mount
  useEffect(() => {
    loadSettings();
    fetchStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const backendUrl = getBackendUrl();
      const data = await apiGet<StreamerbotSettingsResponse>(`${backendUrl}/api/streamerbot-chat/settings`);

      setSettings({
        host: data.host || DEFAULT_STREAMERBOT_CONNECTION.host,
        port: data.port || DEFAULT_STREAMERBOT_CONNECTION.port,
        endpoint: data.endpoint || DEFAULT_STREAMERBOT_CONNECTION.endpoint,
        scheme: data.scheme || DEFAULT_STREAMERBOT_CONNECTION.scheme,
        autoConnect: data.autoConnect ?? DEFAULT_STREAMERBOT_CONNECTION.autoConnect,
        autoReconnect: data.autoReconnect ?? DEFAULT_STREAMERBOT_CONNECTION.autoReconnect,
        // Password is not returned from API for security; keep undefined unless user enters new one
        password: undefined,
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to load Streamer.bot settings:", error);
      // Use defaults on error
      setSettings({ ...DEFAULT_STREAMERBOT_CONNECTION });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const backendUrl = getBackendUrl();
      const status = await apiGet<StreamerbotStatusResponse>(`${backendUrl}/api/streamerbot-chat/status`);
      setConnectionStatus(status);
    } catch (error) {
      console.error("Failed to fetch Streamer.bot status:", error);
      setConnectionStatus({ status: "error", error: { message: "Unable to check status" } });
    }
  };

  const handleChange = useCallback((value: StreamerbotConnectionSettings | undefined) => {
    setSettings(value);
    setHasChanges(true);
    setSaveResult(null);
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setSaveResult(null);

    try {
      const backendUrl = getBackendUrl();
      await apiPut(`${backendUrl}/api/streamerbot-chat/settings`, settings);

      setSaveResult({
        success: true,
        message: t("saveSuccess"),
      });
      setHasChanges(false);
      fetchStatus();
    } catch (error) {
      const message = isClientFetchError(error)
        ? error.errorMessage
        : error instanceof Error
          ? error.message
          : t("saveFailed");

      setSaveResult({
        success: false,
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    try {
      const backendUrl = getBackendUrl();
      await apiPost(`${backendUrl}/api/streamerbot-chat/connect`);
      // Wait a bit for connection to establish
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </div>
            {/* Connection Status Badge */}
            <div className="flex items-center gap-2">
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Streamerbot Connection Form */}
          <StreamerbotConnectionForm
            value={settings}
            onChange={handleChange}
            disabled={saving}
          />

          {/* Save Result */}
          {saveResult && (
            <Alert variant={saveResult.success ? "default" : "destructive"}>
              <AlertDescription className="flex items-center gap-2">
                {saveResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {saveResult.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap pt-2 border-t">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              variant="default"
            >
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

            {isConnected ? (
              <Button
                onClick={handleDisconnect}
                variant="outline"
                disabled={saving}
              >
                <WifiOff className="w-4 h-4 mr-2" />
                {t("disconnect")}
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                variant="outline"
                disabled={saving || isConnecting}
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
              onClick={fetchStatus}
              variant="ghost"
              size="icon"
              disabled={saving}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("setupGuide")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>{t("setupStep1")}</li>
            <li>{t("setupStep2")}</li>
            <li>{t("setupStep3")}</li>
            <li>{t("setupStep4")}</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
