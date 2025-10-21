"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Image, Folder, Radio, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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

  const isOnAir = status.isStreaming || status.isRecording;

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between">
          {/* Left: OBS Status */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">OBS Live Suite</h1>
            
            <Badge variant={status.connected ? "default" : "destructive"} className="text-xs px-2 py-0.5">
              {status.connected ? "Connected" : "Disconnected"}
            </Badge>

            {status.currentScene && (
              <div className="text-xs text-muted-foreground">
                Scene: <span className="font-medium">{status.currentScene}</span>
              </div>
            )}
          </div>

          {/* Center: ON AIR Indicator */}
          <div className="flex items-center gap-2">
            {isOnAir && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white rounded text-xs font-bold animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                <span>ON AIR</span>
              </div>
            )}
          </div>

          {/* Right: Clock and Navigation */}
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono" suppressHydrationWarning>
              {currentTime.toLocaleTimeString()}
            </div>
            <ThemeToggle />
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" title="Dashboard">
                <LayoutDashboard className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/profiles">
              <Button variant="ghost" size="sm" title="Profiles">
                <Folder className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/assets">
              <Button variant="ghost" size="sm" title="Assets">
                <Image className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" title="Settings">
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

