"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  LogOut,
  Cookie,
  ShieldAlert,
} from "lucide-react";
import { apiGet, apiPost, extractErrorMessage } from "@/lib/utils/ClientFetch";

interface InstagramStatus {
  username: string;
  hasSession: boolean;
  hasSessionId: boolean;
  sessionIdMasked: string;
}

export function InstagramSettings() {
  const t = useTranslations("settings.instagram");

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<InstagramStatus>({
    username: "", hasSession: false, hasSessionId: false, sessionIdMasked: "",
  });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const [username, setUsername] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [savingSessionId, setSavingSessionId] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await apiGet<InstagramStatus>("/api/settings/instagram");
      setStatus(data);
      setUsername(data.username);
    } catch (error) {
      console.error("Failed to fetch Instagram status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSaveSessionId = async () => {
    if (!sessionId.trim()) return;

    setSavingSessionId(true);
    setResult(null);

    try {
      await apiPost("/api/settings/instagram", {
        sessionId: sessionId.trim(),
        ...(username.trim() ? { username: username.trim() } : {}),
      });
      setResult({ success: true, message: t("sessionIdSaved") });
      setSessionId("");
      await fetchStatus();
    } catch (error) {
      setResult({
        success: false,
        message: extractErrorMessage(error, t("sessionIdFailed")),
      });
    } finally {
      setSavingSessionId(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setResult(null);

    try {
      await apiPost("/api/settings/instagram/logout");
      setResult({ success: true, message: t("logoutSuccess") });
      setSessionId("");
      await fetchStatus();
    } catch (error) {
      setResult({
        success: false,
        message: extractErrorMessage(error, t("logoutFailed")),
      });
    } finally {
      setLoggingOut(false);
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
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{t("status")}:</span>
        {status.hasSession ? (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {t("connected")}
            {status.username && ` @${status.username}`}
            {status.hasSessionId && ` (${t("viaSessionId")})`}
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {t("notConnected")}
          </Badge>
        )}
      </div>

      {status.hasSessionId && status.sessionIdMasked && (
        <p className="text-xs text-muted-foreground">
          Session ID: {status.sessionIdMasked}
        </p>
      )}

      {/* Result message */}
      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertDescription className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="break-all">{result.message}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Session ID form (only when not connected) */}
      {!status.hasSession && (
        <div className="space-y-4 rounded-md border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Cookie className="w-4 h-4" />
            Session ID
          </div>

          <div className="space-y-2">
            <Label htmlFor="ig-session-username">{t("username")}</Label>
            <Input
              id="ig-session-username"
              type="text"
              placeholder={t("usernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={savingSessionId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ig-sessionid">{t("sessionIdLabel")}</Label>
            <Input
              id="ig-sessionid"
              type="password"
              placeholder={t("sessionIdPlaceholder")}
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveSessionId();
              }}
              disabled={savingSessionId}
            />
            <p className="text-xs text-muted-foreground">{t("sessionIdHelp")}</p>
          </div>

          <Button
            onClick={handleSaveSessionId}
            disabled={savingSessionId || !sessionId.trim()}
          >
            {savingSessionId ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("saving")}
              </>
            ) : (
              <>
                <Cookie className="w-4 h-4 mr-2" />
                {t("saveSessionId")}
              </>
            )}
          </Button>

          {/* How-to guide */}
          <Alert>
            <AlertDescription className="text-sm space-y-2">
              <strong>{t("sessionIdGuide")}</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>{t("sessionIdStep1")}</li>
                <li>{t("sessionIdStep2")}</li>
                <li>{t("sessionIdStep3")}</li>
                <li>{t("sessionIdStep4")}</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Disconnect button */}
      {status.hasSession && (
        <Button
          onClick={handleLogout}
          variant="outline"
          disabled={loggingOut}
        >
          {loggingOut ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("loggingOut")}
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2" />
              {t("logout")}
            </>
          )}
        </Button>
      )}

      {/* Security warning */}
      <Alert variant="destructive">
        <AlertDescription className="text-sm flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong>{t("securityTitle")}</strong>
            <p>{t("securityNote")}</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Help section */}
      <Alert>
        <AlertDescription className="text-sm space-y-2">
          <div>
            <strong>{t("whyLogin")}</strong>
            <p className="mt-1">{t("whyLoginDescription")}</p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
