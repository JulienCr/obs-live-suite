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
  AlertTriangle,
  LogOut,
  Cookie,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { apiGet, apiPost, extractErrorMessage } from "@/lib/utils/ClientFetch";

interface InstagramStatus {
  username: string;
  hasSession: boolean;
  hasSessionId: boolean;
  sessionIdMasked: string;
}

interface InstagramHealth {
  ytdlp: {
    found: boolean;
    version: string;
    paths: string[];
    outdated: boolean;
    impersonation: boolean;
  };
  instaloader: { found: boolean; version: string; paths: string[] };
  session: { configured: boolean };
  minYtdlpVersion: string;
}

/** One flow, its verdict, and what to do about it when it is not green. */
function CapabilityRow({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
      ) : (
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
      )}
      <div>
        <span className="font-medium">{label}</span>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function InstagramSettings() {
  const t = useTranslations("settings.instagram");

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<InstagramStatus>({
    username: "", hasSession: false, hasSessionId: false, sessionIdMasked: "",
  });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const [health, setHealth] = useState<InstagramHealth | null>(null);

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

  // Kept separate from fetchStatus: it spawns yt-dlp and instaloader, so it must not
  // hold up the form.
  const fetchHealth = async () => {
    try {
      setHealth(await apiGet<InstagramHealth>("/api/settings/instagram/health"));
    } catch (error) {
      console.error("Failed to probe Instagram tooling:", error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchHealth();
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

  const mediaIssue = !health
    ? ""
    : !health.ytdlp.found
      ? t("ytdlpMissing")
      : health.ytdlp.outdated
        ? t("ytdlpOutdated", { version: health.ytdlp.version, min: health.minYtdlpVersion })
        : !health.ytdlp.impersonation
          ? t("ytdlpNoImpersonation")
          : "";

  const profileIssue = !health
    ? ""
    : !health.instaloader.found
      ? t("instaloaderMissing")
      : !health.session.configured
        ? t("sessionRequired")
        : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* What actually works right now, per flow */}
      {health && (
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Stethoscope className="w-4 h-4" />
            {t("capabilities")}
          </div>

          <CapabilityRow
            ok={!mediaIssue}
            label={t("postsAndReels")}
            detail={mediaIssue || t("noAccountNeeded", { version: health.ytdlp.version })}
          />
          <CapabilityRow
            ok={!profileIssue}
            label={t("profilePictures")}
            detail={profileIssue || t("sessionOk")}
          />

          {health.ytdlp.paths.length > 1 && (
            <p className="text-xs text-amber-600">
              {t("ytdlpDuplicate", { paths: health.ytdlp.paths.join(", ") })}
            </p>
          )}
        </div>
      )}

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
          // Not an error state any more: only profile pictures need the session.
          <Badge variant="secondary" className="flex items-center gap-1">
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
