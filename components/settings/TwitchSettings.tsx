"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  LogOut,
  User,
  Clock,
  Shield,
} from "lucide-react";
import { apiGet, apiPost, apiDelete, isClientFetchError } from "@/lib/utils/ClientFetch";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import type { TwitchAuthStatus } from "@/lib/models/TwitchAuth";
import { TWITCH_OAUTH_SCOPES } from "@/lib/models/TwitchAuth";

interface TwitchSettingsResponse {
  clientId: string;
  clientSecretSet: boolean;
  clientSecretMasked: string;
  enabled: boolean;
  pollIntervalMs: number;
  authStatus: TwitchAuthStatus;
  isConnected: boolean;
  hasCredentials: boolean;
}

interface TwitchAuthEvent {
  type: "auth-status" | "auth-error" | "token-refreshed";
  data: unknown;
}

/**
 * TwitchSettings - Configure Twitch OAuth integration
 */
export function TwitchSettings() {
  const t = useTranslations("settings.twitch");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();

  // State
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [clientSecretMasked, setClientSecretMasked] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [authStatus, setAuthStatus] = useState<TwitchAuthStatus | null>(null);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Handle WebSocket auth events
  const handleAuthEvent = useCallback((event: TwitchAuthEvent) => {
    if (event.type === "auth-status") {
      setAuthStatus(event.data as TwitchAuthStatus);
    }
  }, []);

  useWebSocketChannel<TwitchAuthEvent>("twitch-auth", handleAuthEvent, {
    logPrefix: "TwitchSettings",
  });

  // Check for OAuth callback results in URL
  useEffect(() => {
    const connected = searchParams.get("twitch_connected");
    const error = searchParams.get("twitch_error");

    if (connected === "true") {
      setResult({
        success: true,
        message: t("connectionSuccess"),
      });
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      setResult({
        success: false,
        message: error,
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, t]);

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await apiGet<TwitchSettingsResponse>("/api/settings/twitch");

      setClientId(data.clientId || "");
      setClientSecretMasked(data.clientSecretMasked || "");
      setHasCredentials(data.hasCredentials);
      setAuthStatus(data.authStatus);

      // Clear secret field if already set (don't show the actual secret)
      if (data.clientSecretSet) {
        setClientSecret("");
      }
    } catch (error) {
      console.error("Failed to load Twitch settings:", error);
      setResult({
        success: false,
        message: isClientFetchError(error) ? error.errorMessage : "Failed to load settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!clientId.trim()) {
      setResult({ success: false, message: t("clientIdRequired") });
      return;
    }

    // Only require secret if not already set
    if (!clientSecret.trim() && !clientSecretMasked) {
      setResult({ success: false, message: t("clientSecretRequired") });
      return;
    }

    try {
      setSaving(true);
      setResult(null);

      // Only send secret if user entered a new one
      const payload: { clientId: string; clientSecret?: string } = {
        clientId: clientId.trim(),
      };

      if (clientSecret.trim()) {
        payload.clientSecret = clientSecret.trim();
      }

      await apiPost("/api/settings/twitch", payload);

      setResult({
        success: true,
        message: t("credentialsSaved"),
      });

      // Reload to get updated state
      await loadSettings();
    } catch (error) {
      setResult({
        success: false,
        message: isClientFetchError(error) ? error.errorMessage : "Failed to save credentials",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setResult(null);

      const response = await apiGet<{ success: boolean; authUrl: string; error?: string }>(
        "/api/twitch/auth/start"
      );

      if (response.success && response.authUrl) {
        // Redirect to Twitch OAuth page
        window.location.href = response.authUrl;
      } else {
        setResult({
          success: false,
          message: response.error || "Failed to start OAuth flow",
        });
        setConnecting(false);
      }
    } catch (error) {
      setResult({
        success: false,
        message: isClientFetchError(error) ? error.errorMessage : "Failed to start OAuth flow",
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(t("disconnectConfirm"))) return;

    try {
      setDisconnecting(true);
      setResult(null);

      await apiPost("/api/twitch/auth/disconnect");

      setResult({
        success: true,
        message: t("disconnected"),
      });

      await loadSettings();
    } catch (error) {
      setResult({
        success: false,
        message: isClientFetchError(error) ? error.errorMessage : "Failed to disconnect",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleClearSettings = async () => {
    if (!confirm(t("clearConfirm"))) return;

    try {
      await apiDelete("/api/settings/twitch");
      setClientId("");
      setClientSecret("");
      setClientSecretMasked("");
      setHasCredentials(false);
      setAuthStatus(null);
      setResult({
        success: true,
        message: t("settingsCleared"),
      });
    } catch (error) {
      setResult({
        success: false,
        message: isClientFetchError(error) ? error.errorMessage : "Failed to clear settings",
      });
    }
  };

  const formatExpiryTime = (expiresAt: number | null): string => {
    if (!expiresAt) return "";
    const now = Date.now();
    const diff = expiresAt - now;
    if (diff <= 0) return t("expired");

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isConnected = authStatus?.state === "authorized";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        {tCommon("loading")}
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

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("connectionStatus")}</CardTitle>
            {isConnected ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {t("connected")}
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {t("notConnected")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isConnected && authStatus?.user && (
            <div className="space-y-3">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {authStatus.user.profileImageUrl ? (
                  <img
                    src={authStatus.user.profileImageUrl}
                    alt={authStatus.user.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <div className="font-medium">{authStatus.user.displayName}</div>
                  <div className="text-sm text-muted-foreground">@{authStatus.user.login}</div>
                </div>
              </div>

              {/* Token expiry */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {t("tokenExpires")}: {formatExpiryTime(authStatus.expiresAt)}
                </span>
              </div>

              {/* Scopes */}
              <div className="flex items-start gap-2 text-sm">
                <Shield className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground mb-1">{t("grantedScopes")}:</div>
                  <div className="flex flex-wrap gap-1">
                    {authStatus.scopes?.map((scope) => (
                      <Badge key={scope} variant="outline" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Disconnect button */}
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full mt-2"
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("disconnecting")}
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("disconnect")}
                  </>
                )}
              </Button>
            </div>
          )}

          {!isConnected && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("notConnectedDesc")}</p>

              {hasCredentials ? (
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("connecting")}
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t("connectToTwitch")}
                    </>
                  )}
                </Button>
              ) : (
                <p className="text-sm text-amber-600">{t("enterCredentialsFirst")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credentials Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("credentials")}</CardTitle>
          <CardDescription>{t("credentialsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client ID */}
          <div className="space-y-2">
            <Label htmlFor="client-id">{t("clientId")}</Label>
            <Input
              id="client-id"
              type="text"
              placeholder={t("clientIdPlaceholder")}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          {/* Client Secret */}
          <div className="space-y-2">
            <Label htmlFor="client-secret">{t("clientSecret")}</Label>
            <Input
              id="client-secret"
              type={showPassword ? "text" : "password"}
              placeholder={clientSecretMasked || t("clientSecretPlaceholder")}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-secret"
                checked={showPassword}
                onCheckedChange={(checked) => setShowPassword(checked === true)}
              />
              <label htmlFor="show-secret" className="text-sm cursor-pointer select-none">
                {t("showSecret")}
              </label>
            </div>
            {clientSecretMasked && !clientSecret && (
              <p className="text-xs text-muted-foreground">{t("secretAlreadySet")}</p>
            )}
          </div>

          {/* Result */}
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {result.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleSaveCredentials} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {tCommon("saving")}
                </>
              ) : (
                tCommon("save")
              )}
            </Button>
            {hasCredentials && (
              <Button variant="outline" onClick={handleClearSettings}>
                {t("clearCredentials")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
            <strong>{t("requiredScopes")}</strong>
            <div className="flex flex-wrap gap-1 mt-1">
              {TWITCH_OAUTH_SCOPES.map((scope) => (
                <Badge key={scope} variant="outline" className="text-xs">
                  {scope}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <a
              href="https://dev.twitch.tv/console/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              {t("openTwitchConsole")}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
