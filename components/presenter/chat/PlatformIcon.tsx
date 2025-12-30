"use client";

import { cn } from "@/lib/utils";
import type { ChatPlatform } from "@/lib/models/StreamerbotChat";

interface PlatformIconProps {
  platform: ChatPlatform;
  size?: "sm" | "md";
  className?: string;
}

export function PlatformIcon({ platform, size = "sm", className }: PlatformIconProps) {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  if (platform === "twitch") {
    return (
      <div
        className={cn(
          sizeClass,
          "inline-flex items-center justify-center rounded-sm bg-purple-600 text-white text-[8px] font-bold",
          className
        )}
        title="Twitch"
      >
        T
      </div>
    );
  }

  if (platform === "youtube") {
    return (
      <div
        className={cn(
          sizeClass,
          "inline-flex items-center justify-center rounded-sm bg-red-600 text-white text-[8px] font-bold",
          className
        )}
        title="YouTube"
      >
        Y
      </div>
    );
  }

  // Trovo or other platforms
  return (
    <div
      className={cn(
        sizeClass,
        "inline-flex items-center justify-center rounded-sm bg-gray-600 text-white text-[8px] font-bold",
        className
      )}
      title={platform}
    >
      {platform.charAt(0).toUpperCase()}
    </div>
  );
}
