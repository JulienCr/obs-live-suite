"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Square, Circle } from "lucide-react";

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
    // TODO: Fetch OBS status from API
    // For now, mock data
    setStatus({
      connected: true,
      currentScene: "Main Scene",
      isStreaming: false,
      isRecording: false,
    });
  }, []);

  const handleStreamToggle = async () => {
    // TODO: Implement stream toggle
    console.log("Toggle stream");
  };

  const handleRecordToggle = async () => {
    // TODO: Implement record toggle
    console.log("Toggle record");
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

          {/* Right: Clock */}
          <div className="text-sm font-mono">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </header>
  );
}

