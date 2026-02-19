"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Maximize, Minimize, Loader2, Check, MonitorOff, FolderOpen } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAppMode } from "@/components/shell/AppModeContext";
import { HeaderOverflowMenu } from "@/components/dashboard/HeaderOverflowMenu";
import { WorkspaceSelector } from "@/components/shell/WorkspaceSelector";
import { TopBarSelect } from "@/components/shell/TopBarSelect";
import { useProfiles, useOBSStatus } from "@/lib/queries";

export function ContentTopBar() {
  const t = useTranslations("dashboard.header");
  const { isFullscreenMode, setIsFullscreenMode } = useAppMode();

  const {
    profiles,
    activeProfile,
    activateProfile,
    isActivating,
  } = useProfiles();

  const { isConnected: obsConnected, currentScene } = useOBSStatus({ refetchInterval: 5000 });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <header className="flex items-center h-10 pr-2 gap-2 border-b bg-card shrink-0">
      {/* Workspace Selector */}
      <WorkspaceSelector />

      {/* Profile Selector */}
      {profiles.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <TopBarSelect
              icon={isActivating ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <FolderOpen className="w-4 h-4 shrink-0" />}
              label={activeProfile ? activeProfile.name : t("noProfile")}
              disabled={isActivating}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {profiles.map((profile) => (
              <DropdownMenuItem
                key={profile.id}
                onClick={() => activateProfile(profile.id)}
                className="flex items-center justify-between"
                disabled={isActivating}
              >
                <span>{profile.name}</span>
                {profile.isActive && <Check className="w-4 h-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* OBS Scene */}
      {obsConnected ? (
        currentScene && (
          <div className="text-xs text-muted-foreground px-2 truncate max-w-[200px]">
            Scene: {currentScene}
          </div>
        )
      ) : (
        <div className="flex items-center gap-1 text-xs text-destructive px-2">
          <MonitorOff className="w-3 h-3" />
          <span>OBS</span>
        </div>
      )}

      {/* Clock */}
      <div className="text-xs font-mono text-muted-foreground px-2" suppressHydrationWarning>
        {formatTime(currentTime)}
      </div>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Fullscreen Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsFullscreenMode(!isFullscreenMode)}
        title={isFullscreenMode ? t("exitFullscreen") : t("fullscreen")}
        className="h-8 w-8 p-0"
      >
        {isFullscreenMode ? (
          <Minimize className="w-4 h-4" />
        ) : (
          <Maximize className="w-4 h-4" />
        )}
      </Button>

      {/* Overflow Menu */}
      <HeaderOverflowMenu />
    </header>
  );
}
