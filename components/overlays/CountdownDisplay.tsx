/**
 * Pure rendering component for Countdown
 * Separated from CountdownRenderer to allow reuse in preview
 */

import { m } from "framer-motion";
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

function formatTime(totalSeconds: number, format: CountdownDisplayProps["format"] = "mm:ss"): string {
  switch (format) {
    case "hh:mm:ss": {
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    case "seconds":
      return totalSeconds.toString();
    case "mm:ss":
    default: {
      const minutes = Math.floor(totalSeconds / 60);
      const remainingSecs = totalSeconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
    }
  }
}

function resolveTextColor(theme: CountdownDisplayProps["theme"]): string {
  if (theme?.color) return theme.color;
  if (theme?.colors?.primary) {
    return `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.accent || theme.colors.primary} 100%)`;
  }
  return "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)";
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

  const layout = theme?.layout || (position ? { ...position, scale: 1 } : { x: 960, y: 540, scale: 1 });
  const finalScale = size?.scale || layout.scale || 1;
  
  const fontFamily = theme?.font?.family || "Courier New, monospace";
  const baseFontSize = theme?.font?.size || 80;
  const fontWeight = theme?.font?.weight || 900;
  
  const styleScales: Record<string, number> = { corner: 0.6, banner: 0.8 };
  const adjustedFontSize = Math.round(baseFontSize * (styleScales[style] ?? 1));
  
  const textColor = resolveTextColor(theme);
  
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
    } : {
      left: `${position?.x || layout.x}px`,
      top: `${position?.y || layout.y}px`,
      // translate and scale are handled by Framer Motion x/y/scale props
      // to avoid FM overwriting the CSS transform property during animation
    }),
    ...(theme && style === "banner" && theme.colors?.surface ? {
      background: `linear-gradient(180deg, ${theme.colors.surface}E6 0%, ${theme.colors.surface}00 100%)`,
    } : {}),
  };

  // Framer Motion x/y/scale props are composed together into a single transform,
  // so centering via translate(-50%, -50%) and theme scale are preserved during animation.
  const fmCenter = isPreview ? {} : { x: "-50%", y: "-50%" };

  return (
    <m.div
      className="countdown"
      style={containerStyle}
      initial={{ opacity: 0, scale: isPreview ? 0.9 : finalScale * 0.9, ...fmCenter }}
      animate={{ opacity: 1, scale: isPreview ? 1 : finalScale, ...fmCenter }}
      exit={{ opacity: 0, scale: isPreview ? 0.9 : finalScale * 0.9, ...fmCenter }}
      transition={{ duration: 0.3 }}
    >
      <div className="countdown-time" style={timeStyle}>{formatTime(seconds, format)}</div>
    </m.div>
  );
}
