"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Cookie,
} from "lucide-react";
import { apiGet, apiPost, extractErrorMessage } from "@/lib/utils/ClientFetch";

interface InstagramStatus {
  username: string;
  hasSession: boolean;
  hasSessionId: boolean;
  sessionIdMasked: string;
}

interface LoginResult {
  success: boolean;
  needs2FA?: boolean;
  message: string;
  hasSession?: boolean;
}

export function InstagramSettings() {
  const t = useTranslations("settings.instagram");

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<InstagramStatus>({
    username: "", hasSession: false, hasSessionId: false, sessionIdMasked: "",
  });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Login form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Session ID form
  const [sessionId, setSessionId] = useState("");
  const [savingSessionId, setSavingSessionId] = useState(false);

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

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;

    setLoggingIn(true);
    setResult(null);

    try {
      const data = await apiPost<LoginResult>("/api/settings/instagram/login", {
        username: username.trim(),
        password,
        ...(needs2FA && twoFACode ? { twoFA: twoFACode.trim() } : {}),
      });

      if (data.needs2FA) {
        setNeeds2FA(true);
        setResult({ success: false, message: data.message });
      } else if (data.success) {
        setResult({ success: true, message: data.message });
        setPassword("");
        setTwoFACode("");
        setNeeds2FA(false);
        await fetchStatus();
      } else {
        setResult({ success: false, message: data.message });
      }
    } catch (error) {
      setResult({
        success: false,
        message: extractErrorMessage(error, t("loginFailed")),
      });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSaveSessionId = async () => {
    if (!sessionId.trim()) return;

    setSavingSessionId(true);
    setResult(null);

    try {
      await apiPost("/api/settings/instagram", {
        sessionId: sessionId.trim(),
        // Save username too if provided
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
      setPassword("");
      setTwoFACode("");
      setNeeds2FA(false);
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

      {/* Session ID masked display */}
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

      {/* Auth forms (shown when not connected) */}
      {!status.hasSession && (
        <Tabs defaultValue="sessionId">
          <TabsList>
            <TabsTrigger value="sessionId" className="gap-1.5">
              <Cookie className="w-3.5 h-3.5" />
              Session ID
            </TabsTrigger>
            <TabsTrigger value="login" className="gap-1.5">
              <LogIn className="w-3.5 h-3.5" />
              {t("login")}
            </TabsTrigger>
          </TabsList>

          {/* Session ID tab */}
          <TabsContent value="sessionId" className="space-y-4 mt-4">
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

            {/* How-to guide for session ID */}
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
          </TabsContent>

          {/* Login tab */}
          <TabsContent value="login" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ig-username">{t("username")}</Label>
              <Input
                id="ig-username"
                type="text"
                placeholder={t("usernamePlaceholder")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loggingIn}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ig-password">{t("password")}</Label>
              <Input
                id="ig-password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !needs2FA) handleLogin();
                }}
                disabled={loggingIn}
              />
              <p className="text-xs text-muted-foreground">{t("passwordHelp")}</p>
            </div>

            {needs2FA && (
              <div className="space-y-2">
                <Label htmlFor="ig-2fa">{t("twoFACode")}</Label>
                <Input
                  id="ig-2fa"
                  type="text"
                  placeholder={t("twoFAPlaceholder")}
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                  disabled={loggingIn}
                  autoFocus
                />
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={loggingIn || !username.trim() || !password.trim()}
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("loggingIn")}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  {needs2FA ? t("verify2FA") : t("login")}
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      )}

      {/* Disconnect button (shown when connected) */}
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

      {/* Help section */}
      <Alert>
        <AlertDescription className="text-sm space-y-2">
          <div>
            <strong>{t("whyLogin")}</strong>
            <p className="mt-1">{t("whyLoginDescription")}</p>
          </div>
          <div>
            <strong>{t("privacyNote")}</strong>
            <p className="mt-1">{t("privacyNoteDescription")}</p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
