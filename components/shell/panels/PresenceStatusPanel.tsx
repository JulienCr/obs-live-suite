"use client";

import { useState, useEffect } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { Wifi, WifiOff, User, Users, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { PanelColorMenu } from "../PanelColorMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RoomPresence, Room } from "@/lib/models/Room";
import { DEFAULT_ROOM_ID } from "@/lib/models/Room";
import { getBackendUrl } from "@/lib/utils/websocket";

function formatLastSeen(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function PresenceStatusContent() {
  const [room, setRoom] = useState<Room | null>(null);
  const [presence, setPresence] = useState<RoomPresence[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPresence = async () => {
    try {
      const res = await fetch(`/api/presenter/rooms/${DEFAULT_ROOM_ID}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
      }

      // Fetch presence from backend
      const presenceRes = await fetch(`${getBackendUrl()}/api/rooms/${DEFAULT_ROOM_ID}/presence`);
      if (presenceRes.ok) {
        const presenceData = await presenceRes.json();
        setPresence(presenceData.presence || []);
      }

      // Check WebSocket status
      const wsRes = await fetch(`${getBackendUrl()}/ws/stats`);
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWsConnected(wsData.isRunning);
      }

      setError(null);
    } catch (err) {
      setError("Failed to fetch status");
      console.error("Failed to fetch presence:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresence();
    const interval = setInterval(fetchPresence, 5000);
    return () => clearInterval(interval);
  }, []);

  const presenterOnline = presence.find(p => p.role === "presenter" && p.isOnline);
  const controlOnline = presence.find(p => p.role === "control" && p.isOnline);
  const producerOnline = presence.find(p => p.role === "producer" && p.isOnline);

  const urgentUnacked = 0; // TODO: Track unacked urgent messages

  const openPresenterView = () => {
    window.open(`/presenter?room=${DEFAULT_ROOM_ID}&role=presenter`, "_blank");
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
      {/* Room Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Room Status</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchPresence}>
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

          {/* Room ID */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Room</span>
            <span className="text-sm font-mono">{room?.name || DEFAULT_ROOM_ID}</span>
          </div>

          {/* Urgent Unacked */}
          {urgentUnacked > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Urgent Unacked</span>
              <Badge variant="destructive">{urgentUnacked}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Presence */}
      <div className="space-y-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Presence
        </div>
        <div className="space-y-2">
          {/* Presenter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                presenterOnline ? "bg-green-500" : "bg-gray-400"
              )} />
              <User className="h-4 w-4" />
              <span className="text-sm">Presenter</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {presenterOnline
                ? formatLastSeen(presenterOnline.lastSeen)
                : "Offline"
              }
            </span>
          </div>

          {/* Control Room */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                controlOnline ? "bg-blue-500" : "bg-gray-400"
              )} />
              <User className="h-4 w-4" />
              <span className="text-sm">Control Room</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {controlOnline
                ? formatLastSeen(controlOnline.lastSeen)
                : "Offline"
              }
            </span>
          </div>

          {/* Producer (if online) */}
          {producerOnline && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <User className="h-4 w-4" />
                <span className="text-sm">Producer</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatLastSeen(producerOnline.lastSeen)}
              </span>
            </div>
          )}

          {presence.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-2">
              No one connected
            </div>
          )}
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
