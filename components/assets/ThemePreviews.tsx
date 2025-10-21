"use client";

import { ColorScheme, FontConfig } from "@/lib/models/Theme";

interface LowerThirdPreviewProps {
  colors: ColorScheme;
  font: FontConfig;
  template: string;
}

interface CountdownPreviewProps {
  colors: ColorScheme;
  font: FontConfig;
  style: string;
}

/**
 * Preview component for lower third themes
 */
export function LowerThirdPreview({ colors, font, template }: LowerThirdPreviewProps) {
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "140px",
    display: "flex",
    alignItems: "center",
    background: `linear-gradient(90deg, ${colors.surface}E6 0%, ${colors.surface}D9 100%)`,
    padding: "16px 24px",
    borderRadius: "8px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
    backdropFilter: "blur(10px)",
  };

  const accentStyle: React.CSSProperties = {
    width: "4px",
    height: "60px",
    marginRight: "16px",
    borderRadius: "2px",
    backgroundColor: colors.primary,
  };

  const avatarStyle: React.CSSProperties = {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    overflow: "hidden",
    border: `3px solid ${colors.primary}`,
    marginRight: "16px",
    backgroundColor: colors.accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "bold",
    color: colors.text,
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: font.family,
    fontSize: `${font.size}px`,
    fontWeight: font.weight,
    color: colors.text,
    lineHeight: "1.2",
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
  };

  const subtitleStyle: React.CSSProperties = {
    fontFamily: font.family,
    fontSize: `${Math.round(font.size * 0.64)}px`,
    fontWeight: Math.max(400, font.weight - 200),
    color: colors.text,
    opacity: 0.9,
    lineHeight: "1.2",
    textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
  };

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">Lower Third Preview</div>
      <div style={containerStyle}>
        <div style={accentStyle} />
        <div style={avatarStyle}>JD</div>
        <div>
          <div style={titleStyle}>John Doe</div>
          <div style={subtitleStyle}>Software Engineer</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Preview component for countdown themes
 */
export function CountdownPreview({ colors, font, style }: CountdownPreviewProps) {
  const getFontSize = () => {
    if (style === "corner") return Math.round(font.size * 0.6);
    if (style === "banner") return Math.round(font.size * 0.8);
    return font.size;
  };

  const getContainerStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: "relative",
      width: "100%",
      height: "140px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      borderRadius: "8px",
      overflow: "hidden",
    };

    if (style === "banner") {
      return {
        ...baseStyle,
        background: `linear-gradient(180deg, ${colors.surface}E6 0%, ${colors.surface}00 100%)`,
        justifyContent: "flex-start",
        paddingTop: "20px",
      };
    }

    if (style === "corner") {
      return {
        ...baseStyle,
        alignItems: "flex-end",
        justifyContent: "flex-start",
        padding: "20px",
      };
    }

    return baseStyle;
  };

  const timeStyle: React.CSSProperties = {
    fontFamily: font.family,
    fontSize: `${getFontSize()}px`,
    fontWeight: font.weight,
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    textShadow: "4px 4px 8px rgba(0, 0, 0, 0.9)",
    letterSpacing: "4px",
  };

  const warningStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 700,
    color: colors.warn,
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
  };

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">
        Countdown Preview ({style === "bold" ? "Center" : style === "corner" ? "Corner" : "Banner"})
      </div>
      <div style={getContainerStyle()}>
        <div style={timeStyle}>05:00</div>
        <div style={warningStyle}>URGENT</div>
      </div>
    </div>
  );
}

