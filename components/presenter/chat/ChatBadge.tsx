"use client";

import { cn } from "@/lib/utils";
import type { ChatBadge as ChatBadgeType } from "@/lib/models/StreamerbotChat";

interface ChatBadgeProps {
  badge: ChatBadgeType;
  size?: "sm" | "md";
  className?: string;
}

export function ChatBadge({ badge, size = "sm", className }: ChatBadgeProps) {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  if (badge.imageUrl) {
    return (
      <img
        src={badge.imageUrl}
        alt={badge.name}
        title={badge.name}
        className={cn(sizeClass, "inline-block", className)}
      />
    );
  }

  // Fallback to text badge
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-bold rounded px-1",
        getBadgeColorClass(badge.name),
        className
      )}
      title={badge.name}
    >
      {getBadgeIcon(badge.name)}
    </span>
  );
}

function getBadgeColorClass(badgeName: string): string {
  switch (badgeName.toLowerCase()) {
    case "broadcaster":
      return "bg-red-500 text-white";
    case "moderator":
    case "mod":
      return "bg-green-500 text-white";
    case "vip":
      return "bg-purple-500 text-white";
    case "subscriber":
    case "sub":
      return "bg-blue-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

function getBadgeIcon(badgeName: string): string {
  switch (badgeName.toLowerCase()) {
    case "broadcaster":
      return "BC";
    case "moderator":
    case "mod":
      return "M";
    case "vip":
      return "V";
    case "subscriber":
    case "sub":
      return "S";
    default:
      return badgeName.charAt(0).toUpperCase();
  }
}
