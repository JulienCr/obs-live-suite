"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Radio, Maximize, Loader2, ChevronDown, Check } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAppMode } from "@/components/shell/AppModeContext";
import { HeaderOverflowMenu } from "./HeaderOverflowMenu";
import { cn } from "@/lib/utils";

interface OBSStatus {
  connected: boolean;
  currentScene: string | null;
  isStreaming: boolean;
  isRecording: boolean;
}

interface Profile {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * DashboardHeader displays operational status and global controls
 */
export function DashboardHeader() {
  const t = useTranslations("dashboard.header");
  const { mode, isOnAir, setIsOnAir, isFullscreenMode, setIsFullscreenMode } = useAppMode();
  const [status, setStatus] = useState<OBSStatus>({
    connected: false,
    currentScene: null,
    isStreaming: false,
    isRecording: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
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

        // Update isOnAir in context
        const onAir = data.isStreaming || data.isRecording;
        setIsOnAir(onAir);
      } catch (error) {
        console.error("Failed to fetch OBS status:", error);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Poll every 2 seconds
    const interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, [setIsOnAir]);

  useEffect(() => {
    // Fetch profiles
    const fetchProfiles = async () => {
      try {
        const res = await fetch("/api/profiles");
        const data = await res.json();
        setProfiles(data.profiles || []);
      } catch (error) {
        console.error("Failed to fetch profiles:", error);
      }
    };

    fetchProfiles();
  }, []);

  const handleReconnect = async () => {
    setIsConnecting(true);
    try {
      await fetch("/api/obs/reconnect", { method: "POST" });
    } catch (error) {
      console.error("Failed to reconnect to OBS:", error);
    } finally {
      setTimeout(() => setIsConnecting(false), 2000);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreenMode(!isFullscreenMode);
  };

  const activeProfile = profiles.find(p => p.isActive);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const handleActivateProfile = async (profileId: string) => {
    try {
      await fetch(`/api/profiles/${profileId}/activate`, { method: "POST" });
      // Refresh profiles list
      const res = await fetch("/api/profiles");
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error("Failed to activate profile:", error);
    }
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Left: App Title + Mode Badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">OBS Live Suite</h1>
            <Badge
              variant={mode === "LIVE" ? "default" : "secondary"}
              className="text-xs px-2 py-1 font-medium"
            >
              {mode}
            </Badge>
          </div>

          {/* Center-Left: OBS Connection State */}
          <div className="flex items-center gap-3">
            {status.connected ? (
              <>
                <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1">
                  {t("connected")}
                </Badge>
                {status.currentScene && (
                  <div className="text-xs text-muted-foreground">
                    {t("scene")}: <span className="font-medium">{status.currentScene}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs px-2 py-1">
                  {t("disconnected")}
                </Badge>
                <Button
                  onClick={handleReconnect}
                  disabled={isConnecting}
                  className="h-10 px-4"
                  variant="default"
                  size="sm"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("reconnecting")}
                    </>
                  ) : (
                    t("reconnect")
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Center: ON AIR Indicator */}
          <div className="flex-1 flex items-center justify-center">
            {isOnAir && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md font-bold animate-pulse">
                <Radio className="w-4 h-4" />
                <span>{t("onAir")}</span>
              </div>
            )}
          </div>

          {/* Right: Profile + Controls */}
          <div className="flex items-center gap-2">
            {/* Active Profile Selector */}
            {profiles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 text-sm"
                  >
                    {activeProfile ? activeProfile.name : t("noProfile")}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {profiles.map((profile) => (
                    <DropdownMenuItem
                      key={profile.id}
                      onClick={() => handleActivateProfile(profile.id)}
                      className="flex items-center justify-between"
                    >
                      <span>{profile.name}</span>
                      {profile.isActive && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Clock */}
            <div className="text-sm font-mono px-2" suppressHydrationWarning>
              {formatTime(currentTime)}
            </div>

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreenMode ? t("exitFullscreen") : t("fullscreen")}
              className="h-10 w-10 p-0"
            >
              <Maximize className="w-4 h-4" />
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Overflow Menu */}
            <HeaderOverflowMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

