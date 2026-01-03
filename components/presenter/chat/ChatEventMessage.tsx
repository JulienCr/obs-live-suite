"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { UserPlus, Crown, Gift, Users, Coins, DollarSign, Sticker } from "lucide-react";
import type { ChatMessage, ChatEventType } from "@/lib/models/StreamerbotChat";
import { PlatformIcon } from "./PlatformIcon";

interface ChatEventMessageProps {
  message: ChatMessage;
  compact?: boolean;
}

export function ChatEventMessage({ message, compact }: ChatEventMessageProps) {
  const t = useTranslations("presenter.events");
  const tTiers = useTranslations("presenter.tiers");
  const { eventType, displayName, metadata, platform } = message;

  const eventConfig = getEventConfig(eventType, message, t, tTiers);

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

function getEventConfig(
  eventType: ChatEventType,
  message: ChatMessage,
  t: (key: string, params?: Record<string, string | number>) => string,
  tTiers: (key: string) => string
) {
  const { metadata } = message;

  const getTierText = (tier?: string): string | null => {
    switch (tier) {
      case "2000":
        return tTiers("tier2");
      case "3000":
        return tTiers("tier3");
      default:
        return null;
    }
  };

  switch (eventType) {
    case "follow":
      return {
        Icon: UserPlus,
        bgClass: "bg-green-500/20 text-green-400",
        text: t("justFollowed"),
        detail: null,
      };
    case "sub":
      return {
        Icon: Crown,
        bgClass: "bg-purple-500/20 text-purple-400",
        text: message.platform === "youtube" ? t("becameMember") : t("subscribed"),
        detail: getTierText(metadata?.subscriptionTier),
      };
    case "resub":
      return {
        Icon: Crown,
        bgClass: "bg-purple-500/20 text-purple-400",
        text: t("resubscribed", { months: metadata?.monthsSubscribed || "?" }),
        detail: getTierText(metadata?.subscriptionTier),
      };
    case "giftsub":
      return {
        Icon: Gift,
        bgClass: "bg-pink-500/20 text-pink-400",
        text: t("giftedSub"),
        detail: null,
      };
    case "raid":
      return {
        Icon: Users,
        bgClass: "bg-orange-500/20 text-orange-400",
        text: t("raiding"),
        detail: t("viewers", { count: String(metadata?.eventData?.viewers || "?") }),
      };
    case "cheer":
      return {
        Icon: Coins,
        bgClass: "bg-yellow-500/20 text-yellow-400",
        text: t("cheered"),
        detail: t("bits", { count: String(metadata?.eventData?.bits || "?") }),
      };
    case "superchat":
      return {
        Icon: DollarSign,
        bgClass: "bg-blue-500/20 text-blue-400",
        text: t("sent"),
        detail: `${metadata?.eventData?.currency || "$"}${metadata?.eventData?.amount || "?"}!`,
      };
    case "supersticker":
      return {
        Icon: Sticker,
        bgClass: "bg-blue-500/20 text-blue-400",
        text: t("sentSuperSticker"),
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
