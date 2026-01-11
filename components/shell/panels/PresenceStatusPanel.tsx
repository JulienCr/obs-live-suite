"use client";

import { useState, useEffect } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { Wifi, WifiOff, Users, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { PanelColorMenu } from "../PanelColorMenu";
import { Button } from "@/components/ui/button";
import { getBackendUrl } from "@/lib/utils/websocket";
import { apiGet } from "@/lib/utils/ClientFetch";

function PresenceStatusContent() {
  const [wsConnected, setWsConnected] = useState(false);
  const [wsClients, setWsClients] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      // Check WebSocket status
      try {
        const wsData = await apiGet<{ isRunning: boolean; clients: number }>(`${getBackendUrl()}/ws/stats`);
        setWsConnected(wsData.isRunning);
        setWsClients(wsData.clients || 0);
      } catch {
        setWsConnected(false);
        setWsClients(0);
      }

      setError(null);
    } catch (err) {
      setError("Failed to fetch status");
      console.error("Failed to fetch status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const openPresenterView = () => {
    window.open("/presenter?role=presenter", "_blank");
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Connection Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Connection Status</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchStatus}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openPresenterView}>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {/* WebSocket Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">WebSocket</span>
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-red-500">Disconnected</span>
                </>
              )}
            </div>
          </div>

          {/* Connected Clients */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Connected Clients
            </span>
            <span className="text-sm font-mono">{wsClients}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Open Presenter View */}
      <Button variant="outline" className="w-full" onClick={openPresenterView}>
        <ExternalLink className="h-4 w-4 mr-2" />
        Open Presenter View
      </Button>
    </div>
  );
}

export function PresenceStatusPanel(props: IDockviewPanelProps) {
  return (
    <PanelColorMenu panelId="presenceStatus">
      <div data-panel-id="presenceStatus" style={{ height: "100%", overflow: "auto" }}>
        <PresenceStatusContent />
      </div>
    </PanelColorMenu>
  );
}
