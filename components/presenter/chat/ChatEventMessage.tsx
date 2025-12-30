"use client";

import { cn } from "@/lib/utils";
import { UserPlus, Crown, Gift, Users, Coins, DollarSign, Sticker } from "lucide-react";
import type { ChatMessage, ChatEventType } from "@/lib/models/StreamerbotChat";
import { PlatformIcon } from "./PlatformIcon";

interface ChatEventMessageProps {
  message: ChatMessage;
  compact?: boolean;
}

export function ChatEventMessage({ message, compact }: ChatEventMessageProps) {
  const { eventType, displayName, metadata, platform } = message;

  const eventConfig = getEventConfig(eventType, message);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 rounded",
        eventConfig.bgClass,
        compact ? "py-0.5 text-xs" : "py-1 text-sm"
      )}
    >
      <PlatformIcon platform={platform} size="sm" />
      <eventConfig.Icon className={cn("flex-shrink-0", compact ? "w-3 h-3" : "w-4 h-4")} />
      <span className="font-medium">{displayName}</span>
      <span className="text-muted-foreground">{eventConfig.text}</span>
      {eventConfig.detail && <span className="font-medium">{eventConfig.detail}</span>}
    </div>
  );
}

function getEventConfig(eventType: ChatEventType, message: ChatMessage) {
  const { metadata } = message;

  switch (eventType) {
    case "follow":
      return {
        Icon: UserPlus,
        bgClass: "bg-green-500/20 text-green-400",
        text: "just followed!",
        detail: null,
      };
    case "sub":
      return {
        Icon: Crown,
        bgClass: "bg-purple-500/20 text-purple-400",
        text: message.platform === "youtube" ? "became a member!" : "subscribed!",
        detail: getTierText(metadata?.subscriptionTier),
      };
    case "resub":
      return {
        Icon: Crown,
        bgClass: "bg-purple-500/20 text-purple-400",
        text: `resubscribed for ${metadata?.monthsSubscribed || "?"} months!`,
        detail: getTierText(metadata?.subscriptionTier),
      };
    case "giftsub":
      return {
        Icon: Gift,
        bgClass: "bg-pink-500/20 text-pink-400",
        text: "gifted a sub!",
        detail: null,
      };
    case "raid":
      return {
        Icon: Users,
        bgClass: "bg-orange-500/20 text-orange-400",
        text: "is raiding with",
        detail: `${metadata?.eventData?.viewers || "?"} viewers!`,
      };
    case "cheer":
      return {
        Icon: Coins,
        bgClass: "bg-yellow-500/20 text-yellow-400",
        text: "cheered",
        detail: `${metadata?.eventData?.bits || "?"} bits!`,
      };
    case "superchat":
      return {
        Icon: DollarSign,
        bgClass: "bg-blue-500/20 text-blue-400",
        text: "sent",
        detail: `${metadata?.eventData?.currency || "$"}${metadata?.eventData?.amount || "?"}!`,
      };
    case "supersticker":
      return {
        Icon: Sticker,
        bgClass: "bg-blue-500/20 text-blue-400",
        text: "sent a Super Sticker for",
        detail: `${metadata?.eventData?.currency || "$"}${metadata?.eventData?.amount || "?"}!`,
      };
    default:
      return {
        Icon: Crown,
        bgClass: "bg-gray-500/20",
        text: "",
        detail: null,
      };
  }
}

function getTierText(tier?: string): string | null {
  switch (tier) {
    case "2000":
      return "(Tier 2)";
    case "3000":
      return "(Tier 3)";
    default:
      return null;
  }
}
