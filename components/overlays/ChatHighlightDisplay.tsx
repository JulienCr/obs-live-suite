"use client";

import { ChatHighlightMessagePart } from "@/lib/models/OverlayEvents";
import "./chat-highlight.css";

interface ChatBadge {
  name: string;
  imageUrl?: string;
}

interface ChatHighlightMetadata {
  color?: string;
  badges?: ChatBadge[];
  isMod?: boolean;
  isVip?: boolean;
  isSubscriber?: boolean;
  isBroadcaster?: boolean;
}

interface ChatHighlightTheme {
  colors: {
    primary: string;
    accent: string;
    surface: string;
    text: string;
  };
  font: {
    family: string;
    size: number;
    weight: number;
  };
}

export interface ChatHighlightDisplayProps {
  displayName: string;
  message: string;
  parts?: ChatHighlightMessagePart[];
  platform?: "twitch" | "youtube" | "trovo";
  metadata?: ChatHighlightMetadata;
  side?: "left" | "right" | "center";
  theme?: ChatHighlightTheme;
  animating?: boolean;
  isPreview?: boolean;
}

/**
 * Pure display component for Chat Highlight overlay
 * Displays a chat message in a lower-third style bar
 */
export function ChatHighlightDisplay({
  displayName,
  message,
  parts,
  platform = "twitch",
  metadata,
  side = "center",
  theme,
  animating = true,
  isPreview = false,
}: ChatHighlightDisplayProps) {
  // Theme-based colors
  const backgroundColor = theme
    ? `rgba(${parseInt(theme.colors.surface.slice(1, 3), 16)}, ${parseInt(theme.colors.surface.slice(3, 5), 16)}, ${parseInt(theme.colors.surface.slice(5, 7), 16)}, 0.85)`
    : "rgba(15, 16, 20, 0.85)";

  const textColor = theme?.colors.text || "#ffffff";
  const accentColor = theme?.colors.accent || "#9146FF"; // Twitch purple as default

  // Username color: use metadata color, or role-based, or accent
  const usernameColor = metadata?.color || getUsernameRoleColor(metadata) || accentColor;

  const fontFamily = theme?.font.family || "Inter, sans-serif";
  const baseFontSize = theme?.font.size || 28;
  const fontWeight = theme?.font.weight || 600;

  const cssVars = {
    "--ch-color-bg": backgroundColor,
    "--ch-color-text": textColor,
    "--ch-color-username": usernameColor,
    "--ch-font-family": fontFamily,
    "--ch-font-size": `${baseFontSize}px`,
    "--ch-font-weight": fontWeight,
  } as React.CSSProperties;

  const containerStyle: React.CSSProperties = {
    ...cssVars,
    ...(isPreview
      ? {
          position: "relative" as const,
        }
      : {
          position: "fixed" as const,
          ...(side === "center"
            ? {
                left: "50%",
                bottom: "80px",
                transform: "translateX(-50%)",
              }
            : side === "right"
              ? {
                  right: "60px",
                  bottom: "80px",
                }
              : {
                  left: "60px",
                  bottom: "80px",
                }),
        }),
  };

  return (
    <div
      className={`chat-highlight chat-highlight--${side} ${animating ? "chat-highlight--visible" : "chat-highlight--hidden"}`}
      style={containerStyle}
    >
      <div className="chat-highlight__bar">
        {/* Header row: platform + badges + username */}
        <div className="chat-highlight__header">
          {/* Platform icon */}
          <div className="chat-highlight__platform">
            <PlatformIcon platform={platform} />
          </div>

          {/* Badges */}
          {metadata?.badges && metadata.badges.length > 0 && (
            <div className="chat-highlight__badges">
              {metadata.badges.map((badge, index) => (
                <ChatHighlightBadge key={`${badge.name}-${index}`} badge={badge} />
              ))}
            </div>
          )}

          {/* Username */}
          <span
            className="chat-highlight__username"
            style={{ color: usernameColor }}
          >
            {displayName}
          </span>
        </div>

        {/* Message content */}
        <div className="chat-highlight__message">
          {parts && parts.length > 0 ? (
            parts.map((part, index) => {
              if (part.type === "emote") {
                return (
                  <img
                    key={index}
                    src={part.imageUrl}
                    alt={part.name}
                    title={part.name}
                    className="chat-highlight__emote"
                  />
                );
              }
              return <span key={index}>{part.text}</span>;
            })
          ) : (
            message
          )}
        </div>
      </div>
    </div>
  );
}

function getUsernameRoleColor(metadata?: ChatHighlightMetadata): string | undefined {
  if (!metadata) return undefined;
  if (metadata.isBroadcaster) return "#ff0000";
  if (metadata.isMod) return "#00ff00";
  if (metadata.isVip) return "#e005b9";
  return undefined;
}

function PlatformIcon({ platform }: { platform: "twitch" | "youtube" | "trovo" }) {
  if (platform === "twitch") {
    return (
      <svg viewBox="0 0 24 24" className="chat-highlight__platform-icon chat-highlight__platform-icon--twitch">
        <path
          fill="currentColor"
          d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"
        />
      </svg>
    );
  }
  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="chat-highlight__platform-icon chat-highlight__platform-icon--youtube">
        <path
          fill="currentColor"
          d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
        />
      </svg>
    );
  }
  // Trovo
  return (
    <svg viewBox="0 0 24 24" className="chat-highlight__platform-icon chat-highlight__platform-icon--trovo">
      <circle fill="currentColor" cx="12" cy="12" r="10" />
    </svg>
  );
}

function ChatHighlightBadge({ badge }: { badge: ChatBadge }) {
  if (badge.imageUrl) {
    return (
      <img
        src={badge.imageUrl}
        alt={badge.name}
        title={badge.name}
        className="chat-highlight__badge"
      />
    );
  }

  // Fallback text badge
  const badgeClass = getBadgeClass(badge.name);
  return (
    <span className={`chat-highlight__badge-text ${badgeClass}`} title={badge.name}>
      {badge.name.charAt(0).toUpperCase()}
    </span>
  );
}

function getBadgeClass(badgeName: string): string {
  switch (badgeName.toLowerCase()) {
    case "broadcaster":
      return "chat-highlight__badge-text--broadcaster";
    case "moderator":
    case "mod":
      return "chat-highlight__badge-text--mod";
    case "vip":
      return "chat-highlight__badge-text--vip";
    case "subscriber":
    case "sub":
      return "chat-highlight__badge-text--sub";
    default:
      return "";
  }
}
