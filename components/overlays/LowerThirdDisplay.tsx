/**
 * Pure rendering component for Lower Third
 * Separated from LowerThirdRenderer to allow reuse in preview
 */

import { ColorScheme, FontConfig, LayoutConfig } from "@/lib/models/Theme";
import "./lower-third.css";

export interface LowerThirdDisplayProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  accentColor?: string;
  theme?: {
    colors: ColorScheme;
    font: FontConfig;
    layout: LayoutConfig;
  };
  animating?: boolean;
  isPreview?: boolean;
}

/**
 * Pure display component for Lower Third overlay
 * Can be used in both live overlay and theme preview
 */
export function LowerThirdDisplay({
  title,
  subtitle,
  avatarUrl,
  accentColor: propAccentColor,
  theme,
  animating = true,
  isPreview = false,
}: LowerThirdDisplayProps) {
  // Apply theme styles
  const layout = theme?.layout || { x: 60, y: 920, scale: 1 };
  
  // Use theme colors if available, otherwise fall back to accentColor
  const accentColor = theme?.colors.primary || propAccentColor || "#3b82f6";
  const backgroundColor = theme 
    ? `linear-gradient(90deg, ${theme.colors.surface}E6 0%, ${theme.colors.surface}D9 100%)`
    : "linear-gradient(90deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.85) 100%)";
  
  const containerStyle: React.CSSProperties = {
    background: backgroundColor,
    // Apply layout positioning (only in non-preview mode)
    ...(isPreview ? {
      position: "relative" as const,
      transform: "none",
    } : {
      left: `${layout.x}px`,
      bottom: `${1080 - layout.y}px`,
      transform: `translateY(100%) scale(${layout.scale})`,
      transformOrigin: "bottom left",
    }),
  };

  const titleStyle: React.CSSProperties = theme ? {
    fontFamily: theme.font.family,
    fontSize: `${theme.font.size}px`,
    fontWeight: theme.font.weight,
    color: theme.colors.text,
  } : {
    fontFamily: "inherit",
    fontSize: "28px",
    fontWeight: 700,
    color: "white",
  };

  const subtitleStyle: React.CSSProperties = theme ? {
    fontFamily: theme.font.family,
    fontSize: `${Math.round(theme.font.size * 0.64)}px`,
    fontWeight: Math.max(400, theme.font.weight - 200),
    color: theme.colors.text,
  } : {
    fontFamily: "inherit",
    fontSize: "18px",
    fontWeight: 400,
    color: "rgba(255, 255, 255, 0.9)",
  };

  return (
    <div
      className={`lower-third ${animating ? "animate-in" : "animate-out"}`}
      style={containerStyle}
    >
      <div
        className="lower-third-accent"
        style={{ backgroundColor: accentColor }}
      />
      {avatarUrl && avatarUrl !== "" && avatarUrl !== "null" && (
        <div className="lower-third-avatar-container">
          <div 
            className="lower-third-avatar"
            style={{ borderColor: accentColor }}
          >
            <img src={avatarUrl} alt={title} />
          </div>
        </div>
      )}
      <div className="lower-third-content">
        <div className="lower-third-title" style={titleStyle}>{title}</div>
        {subtitle && (
          <div className="lower-third-subtitle" style={subtitleStyle}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}

