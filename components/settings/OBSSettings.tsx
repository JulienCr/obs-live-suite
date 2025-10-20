"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Loader2, TestTube } from "lucide-react";

interface OBSConfig {
  url: string;
  password: string;
}

/**
 * OBS WebSocket connection settings
 */
export function OBSSettings() {
  const [config, setConfig] = useState<OBSConfig>({
    url: "ws://localhost:4455",
    password: "",
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
      const res = await fetch("/api/settings/obs");
      const data = await res.json();
      setConfig({
        url: data.url || "ws://localhost:4455",
        password: data.password || "", // Load password to show current value
      });
      setSourceIsDatabase(data.sourceIsDatabase);
    } catch (error) {
      console.error("Failed to load OBS settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("http://localhost:3002/api/obs/status");
      const data = await res.json();
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
      const res = await fetch("/api/settings/obs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: config.url,
          password: config.password || undefined,
          testOnly: true, // Don't save, just test
        }),
      });

      const data = await res.json();

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
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/settings/obs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: config.url,
          password: config.password || undefined,
          testOnly: false, // Save settings
        }),
      });

      const data = await res.json();

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
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearSettings = async () => {
    if (!confirm("Clear saved settings and use .env defaults?")) return;

    try {
      await fetch("/api/settings/obs", { method: "DELETE" });
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
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">OBS WebSocket Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure connection to OBS Studio WebSocket server
        </p>
      </div>

      {/* Current Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">Current Status:</span>
        {currentStatus?.connected ? (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Disconnected
          </Badge>
        )}
        {currentStatus?.currentScene && (
          <span className="text-sm text-muted-foreground">
            Scene: {currentStatus.currentScene}
          </span>
        )}
        <Badge variant="outline" className="ml-auto">
          Source: {sourceIsDatabase ? "Database (UI)" : ".env file"}
        </Badge>
      </div>

      {/* WebSocket URL */}
      <div className="space-y-2">
        <Label htmlFor="obs-url">WebSocket URL</Label>
        <Input
          id="obs-url"
          type="text"
          placeholder="ws://localhost:4455"
          value={config.url}
          onChange={(e) => setConfig({ ...config, url: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Default: ws://localhost:4455 (OBS WebSocket default port)
        </p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="obs-password">Password (Optional)</Label>
        <Input
          id="obs-password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter OBS WebSocket password"
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
            Show password
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Find in OBS: Tools → obs-websocket Settings → Show Connect Info
        </p>
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
              Testing...
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>
        <Button onClick={handleSave} disabled={testing || saving} variant="default">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
        {sourceIsDatabase && (
          <Button onClick={handleClearSettings} variant="outline" disabled={testing || saving}>
            Clear & Use .env
          </Button>
        )}
      </div>

      {/* Help */}
      <Alert>
        <AlertDescription className="text-sm space-y-3">
          <div>
            <strong>Setup Guide:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Open OBS Studio</li>
              <li>Go to Tools → obs-websocket Settings</li>
              <li>Check "Enable WebSocket server"</li>
              <li>
                Note the Server Port (default: 4455) and Password (if enabled)
              </li>
              <li>Enter the connection details above and test</li>
            </ol>
          </div>
          <div>
            <strong>Configuration Priority:</strong>
            <p className="mt-1">
              Settings saved here take priority over .env file. 
              Use "Clear & Use .env" to revert to environment variables.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

