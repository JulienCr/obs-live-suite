"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

interface BackendHealth {
  status: string;
  wsRunning: boolean;
  obsConnected: boolean;
  timestamp: number;
}

/**
 * Backend server connection settings
 */
export function BackendSettings() {
  const [backendUrl, setBackendUrl] = useState("http://localhost:3002");
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
    // Poll health every 5 seconds
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${backendUrl}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setHealth(null);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await checkHealth();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Backend Server Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure connection to the backend WebSocket and API server
        </p>
      </div>

      {/* Current Status */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Server Status:</span>
          {health ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Offline
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {health && (
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">WebSocket:</span>
              {health.wsRunning ? (
                <Badge variant="outline" className="text-xs">Running</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Stopped</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">OBS Connection:</span>
              {health.obsConnected ? (
                <Badge variant="outline" className="text-xs">Connected</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Disconnected</Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backend URL */}
      <div className="space-y-2">
        <Label htmlFor="backend-url">Backend HTTP API URL</Label>
        <Input
          id="backend-url"
          type="text"
          placeholder="http://localhost:3002"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          URL of the backend server HTTP API (default: http://localhost:3002)
        </p>
      </div>

      {/* WebSocket URL (Read-only info) */}
      <div className="space-y-2">
        <Label>WebSocket URL (for overlays)</Label>
        <Input
          type="text"
          value="ws://localhost:3003"
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Overlay pages connect directly to this WebSocket (cannot be changed)
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <div>
              <div className="font-medium">Cannot connect to backend</div>
              <div className="text-xs mt-1">{error}</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Help */}
      <Alert>
        <AlertDescription className="text-sm">
          <strong>Starting the Backend:</strong>
          <div className="mt-2 space-y-1 font-mono text-xs bg-muted p-2 rounded">
            <div># Option 1: Start both frontend and backend</div>
            <div>pnpm dev</div>
            <div className="mt-2"># Option 2: Start backend only</div>
            <div>pnpm run backend</div>
          </div>
          <p className="mt-2">
            The backend runs on port 3002 (HTTP API) and port 3003 (WebSocket).
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

