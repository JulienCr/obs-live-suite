"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [testing, setTesting] = useState(false);
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
    // Load default configuration
    const savedConfig = {
      url: "ws://localhost:4455",
      password: "", // Never load password for security
    };
    setConfig(savedConfig);

    // Fetch current OBS status
    fetchStatus();
  }, []);

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
      // Test connection via backend
      const res = await fetch("http://localhost:3002/api/obs/reconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: config.url,
          password: config.password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: "Successfully connected to OBS!",
          obsVersion: data.obsVersion,
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
    // In a real app, this would save to backend/database
    // For now, user needs to update .env file
    alert(
      "Please update your .env file with:\n\n" +
        `OBS_WEBSOCKET_URL=${config.url}\n` +
        `OBS_WEBSOCKET_PASSWORD=${config.password}\n\n` +
        "Then restart the backend server."
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">OBS WebSocket Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure connection to OBS Studio WebSocket server
        </p>
      </div>

      {/* Current Status */}
      <div className="flex items-center gap-2">
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
          type="password"
          placeholder="Enter OBS WebSocket password"
          value={config.password}
          onChange={(e) => setConfig({ ...config, password: e.target.value })}
        />
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
      <div className="flex gap-3">
        <Button onClick={handleTest} disabled={testing}>
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
        <Button onClick={handleSave} variant="default">
          Save Settings
        </Button>
      </div>

      {/* Help */}
      <Alert>
        <AlertDescription className="text-sm">
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
        </AlertDescription>
      </Alert>
    </div>
  );
}

