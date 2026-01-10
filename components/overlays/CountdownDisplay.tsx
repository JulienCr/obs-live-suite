/**
 * Pure rendering component for Countdown
 * Separated from CountdownRenderer to allow reuse in preview
 */

import { ColorScheme, FontConfig, LayoutConfig } from "@/lib/models/Theme";
import "./countdown.css";

export interface CountdownDisplayProps {
  seconds: number;
  style?: "bold" | "corner" | "banner";
  position?: { x: number; y: number };
  format?: "mm:ss" | "hh:mm:ss" | "seconds";
  size?: { scale: number };
  theme?: {
    colors?: ColorScheme;
    font?: FontConfig;
    layout?: LayoutConfig;
    color?: string;
    shadow?: boolean;
  };
  isPreview?: boolean;
}

/**
 * Pure display component for Countdown overlay
 * Can be used in both live overlay and theme preview
 */
export function CountdownDisplay({
  seconds,
  style = "bold",
  position,
  format = "mm:ss",
  size,
  theme,
  isPreview = false,
}: CountdownDisplayProps) {
  const formatTime = (totalSeconds: number): string => {
    switch (format) {
      case "hh:mm:ss":
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      case "seconds":
        return totalSeconds.toString();
      case "mm:ss":
      default:
        const minutes = Math.floor(totalSeconds / 60);
        const remainingSecs = totalSeconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
    }
  };

  // Apply theme styles with layout positioning
  const layout = theme?.layout || (position ? { ...position, scale: 1 } : { x: 960, y: 540, scale: 1 });
  const finalScale = size?.scale || layout.scale || 1;
  
  // Determine font settings
  const fontFamily = theme?.font?.family || "Courier New, monospace";
  const baseFontSize = theme?.font?.size || 80;
  const fontWeight = theme?.font?.weight || 900;
  
  // Adjust size for different styles
  let adjustedFontSize = baseFontSize;
  if (style === "corner") {
    adjustedFontSize = Math.round(baseFontSize * 0.6);
  } else if (style === "banner") {
    adjustedFontSize = Math.round(baseFontSize * 0.8);
  }
  
  // Determine color
  const textColor = theme?.color || (theme?.colors?.primary ? 
    `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.accent || theme.colors.primary} 100%)` : 
    "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)");
  
  const timeStyle: React.CSSProperties = {
    fontFamily,
    fontSize: `${adjustedFontSize}px`,
    fontWeight,
    display: "inline-block",
    lineHeight: 1,
    ...(textColor.startsWith('#') ? {
      color: textColor,
    } : {
      background: textColor,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    }),
    ...(theme?.shadow !== false ? {
      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
    } : {}),
  };

  const containerStyle: React.CSSProperties = {
    // Apply layout positioning (only in non-preview mode)
    ...(isPreview ? {
      position: "relative" as const,
      transform: "none",
    } : {
      left: `${position?.x || layout.x}px`,
      top: `${position?.y || layout.y}px`,
      transform: `translate(-50%, -50%) scale(${finalScale})`,
      transformOrigin: "center",
    }),
    ...(theme && style === "banner" && theme.colors?.surface ? {
      background: `linear-gradient(180deg, ${theme.colors.surface}E6 0%, ${theme.colors.surface}00 100%)`,
    } : {}),
  };

  return (
    <div className="countdown" style={containerStyle}>
      <div className="countdown-time" style={timeStyle}>{formatTime(seconds)}</div>
    </div>
  );
}

