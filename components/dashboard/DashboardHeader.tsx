"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Square, Circle, Settings, Image, Folder } from "lucide-react";

interface OBSStatus {
  connected: boolean;
  currentScene: string | null;
  isStreaming: boolean;
  isRecording: boolean;
}

/**
 * DashboardHeader displays OBS status and controls
 */
export function DashboardHeader() {
  const [status, setStatus] = useState<OBSStatus>({
    connected: false,
    currentScene: null,
    isStreaming: false,
    isRecording: false,
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update clock every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch OBS status from API
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/obs/status");
        const data = await res.json();
        setStatus({
          connected: data.connected,
          currentScene: data.currentScene,
          isStreaming: data.isStreaming,
          isRecording: data.isRecording,
        });
      } catch (error) {
        console.error("Failed to fetch OBS status:", error);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Poll every 2 seconds
    const interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleStreamToggle = async () => {
    try {
      const endpoint = status.isStreaming ? "/api/obs/stream/stop" : "/api/obs/stream/start";
      await fetch(endpoint, { method: "POST" });
      // Status will update on next poll
    } catch (error) {
      console.error("Failed to toggle stream:", error);
    }
  };

  const handleRecordToggle = async () => {
    try {
      const endpoint = status.isRecording ? "/api/obs/record/stop" : "/api/obs/record/start";
      await fetch(endpoint, { method: "POST" });
      // Status will update on next poll
    } catch (error) {
      console.error("Failed to toggle record:", error);
    }
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: OBS Status */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">OBS Live Suite</h1>
            
            <Badge variant={status.connected ? "default" : "destructive"}>
              {status.connected ? "Connected" : "Disconnected"}
            </Badge>

            {status.currentScene && (
              <div className="text-sm text-muted-foreground">
                Scene: <span className="font-medium">{status.currentScene}</span>
              </div>
            )}
          </div>

          {/* Center: Stream/Record Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={status.isStreaming ? "destructive" : "default"}
              size="sm"
              onClick={handleStreamToggle}
              disabled={!status.connected}
            >
              {status.isStreaming ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Stream
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Stream
                </>
              )}
            </Button>

            <Button
              variant={status.isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={handleRecordToggle}
              disabled={!status.connected}
            >
              {status.isRecording ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
          </div>

          {/* Right: Clock and Actions */}
          <div className="flex items-center gap-4">
            <div className="text-sm font-mono" suppressHydrationWarning>
              {currentTime.toLocaleTimeString()}
            </div>
            <Link href="/profiles">
              <Button variant="ghost" size="sm" title="Profiles">
                <Folder className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/assets">
              <Button variant="ghost" size="sm" title="Assets">
                <Image className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" title="Settings">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

