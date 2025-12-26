"use client";

import { useEffect, useState, useRef } from "react";
import { LowerThirdAnimationConfig } from "@/lib/models/OverlayEvents";
import { DEFAULT_LOGO_IMAGE } from "@/lib/config/lowerThirdDefaults";
import { ColorScheme, FontConfig, LayoutConfig, LowerThirdAnimationTheme } from "@/lib/models/Theme";
import "./lower-third.css";

export interface LowerThirdDisplayProps {
  title: string;
  subtitle?: string;
  logoImage?: string;
  avatarImage?: string;
  logoHasPadding?: boolean;
  accentColor?: string;
  theme?: {
    colors: ColorScheme;
    font: FontConfig;
    layout: LayoutConfig;
    lowerThirdAnimation?: LowerThirdAnimationTheme;
  };
  animationConfig?: LowerThirdAnimationConfig;
  animating?: boolean;
  isPreview?: boolean;
}

/**
 * Pure display component for Lower Third overlay with flip animation
 * Can be used in both live overlay and theme preview
 */
export function LowerThirdDisplay({
  title,
  subtitle,
  logoImage,
  avatarImage,
  logoHasPadding = false,
  accentColor: propAccentColor,
  theme,
  animationConfig,
  animating = true,
  isPreview = false,
}: LowerThirdDisplayProps) {
  const [logoVisible, setLogoVisible] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Merge config with priority: animationConfig prop > theme.lowerThirdAnimation > defaults
  const themeAnimation = theme?.lowerThirdAnimation;
  
  const config = {
    timing: {
      logoFadeDuration: animationConfig?.timing?.logoFadeDuration ?? themeAnimation?.timing?.logoFadeDuration ?? 200,
      logoScaleDuration: animationConfig?.timing?.logoScaleDuration ?? themeAnimation?.timing?.logoScaleDuration ?? 200,
      flipDuration: animationConfig?.timing?.flipDuration ?? themeAnimation?.timing?.flipDuration ?? 600,
      flipDelay: animationConfig?.timing?.flipDelay ?? themeAnimation?.timing?.flipDelay ?? 500,
      barAppearDelay: animationConfig?.timing?.barAppearDelay ?? themeAnimation?.timing?.barAppearDelay ?? 800,
      barExpandDuration: animationConfig?.timing?.barExpandDuration ?? themeAnimation?.timing?.barExpandDuration ?? 450,
      textAppearDelay: animationConfig?.timing?.textAppearDelay ?? themeAnimation?.timing?.textAppearDelay ?? 1000,
      textFadeDuration: animationConfig?.timing?.textFadeDuration ?? themeAnimation?.timing?.textFadeDuration ?? 250,
    },
    styles: {
      barBorderRadius: animationConfig?.styles?.barBorderRadius ?? themeAnimation?.styles?.barBorderRadius ?? 16,
      barMinWidth: animationConfig?.styles?.barMinWidth ?? themeAnimation?.styles?.barMinWidth ?? 200,
      avatarBorderWidth: animationConfig?.styles?.avatarBorderWidth ?? themeAnimation?.styles?.avatarBorderWidth ?? 4,
      avatarBorderColor: animationConfig?.styles?.avatarBorderColor ?? themeAnimation?.styles?.avatarBorderColor ?? '#272727',
    },
  };

  // Apply theme styles
  const layout = theme?.layout || { x: 60, y: 920, scale: 1 };
  const accentColor = theme?.colors.primary || propAccentColor || "#3b82f6";
  
  // Use theme animation color overrides if available, otherwise use theme colors
  const backgroundColor = themeAnimation?.colors?.barBgColor || (theme 
    ? `rgba(${parseInt(theme.colors.surface.slice(1, 3), 16)}, ${parseInt(theme.colors.surface.slice(3, 5), 16)}, ${parseInt(theme.colors.surface.slice(5, 7), 16)}, 0.75)`
    : "rgba(15, 16, 20, 0.75)");

  const titleColor = themeAnimation?.colors?.titleColor || theme?.colors.text || "white";
  const subtitleColor = themeAnimation?.colors?.subtitleColor || (theme?.colors.text 
    ? `${theme.colors.text}BF` 
    : "rgba(255, 255, 255, 0.75)");

  // Determine images
  const finalLogoImage = logoImage || DEFAULT_LOGO_IMAGE;
  const finalAvatarImage = avatarImage;

  // Animation sequence
  useEffect(() => {
    // Clear any existing timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (!animating) {
      // Reset to hidden state
      setLogoVisible(false);
      setFlipped(false);
      setBarVisible(false);
      setTextVisible(false);
      return;
    }

    // Reset states
    setLogoVisible(false);
    setFlipped(false);
    setBarVisible(false);
    setTextVisible(false);

    // Start animation sequence with a small initial delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      // 1. Logo appears
      setLogoVisible(true);
      
      // 2. Flip starts
      const flipTimeout = setTimeout(() => {
        setFlipped(true);
      }, config.timing.flipDelay);
      
      // 3. Bar appears
      const barTimeout = setTimeout(() => {
        setBarVisible(true);
      }, config.timing.barAppearDelay);
      
      // 4. Text appears
      const textTimeout = setTimeout(() => {
        setTextVisible(true);
      }, config.timing.textAppearDelay);
      
      timeoutsRef.current.push(flipTimeout, barTimeout, textTimeout);
    }, 50);

    timeoutsRef.current.push(initTimeout);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [animating, config.timing.flipDelay, config.timing.barAppearDelay, config.timing.textAppearDelay]);

  // Generate CSS variables
  const cssVars = {
    '--lt-timing-logo-fade': `${config.timing.logoFadeDuration}ms`,
    '--lt-timing-logo-scale': `${config.timing.logoScaleDuration}ms`,
    '--lt-timing-flip': `${config.timing.flipDuration}ms`,
    '--lt-timing-bar-expand': `${config.timing.barExpandDuration}ms`,
    '--lt-timing-text-fade': `${config.timing.textFadeDuration}ms`,
    '--lt-color-title': titleColor,
    '--lt-color-subtitle': subtitleColor,
    '--lt-color-bar-bg': backgroundColor,
    '--lt-color-border-avatar': config.styles.avatarBorderColor,
    '--lt-bar-border-radius': `${config.styles.barBorderRadius}px`,
    '--lt-bar-min-width': `${config.styles.barMinWidth}px`,
  } as React.CSSProperties;

  const containerStyle: React.CSSProperties = {
    ...cssVars,
    ...(isPreview ? {
      position: "relative" as const,
      left: "auto",
      bottom: "auto",
    } : {
      left: `${layout.x}px`,
      bottom: `${1080 - layout.y}px`,
      transform: `scale(${layout.scale})`,
      transformOrigin: "bottom left",
    }),
  };

  const titleStyle: React.CSSProperties = theme ? {
    fontFamily: theme.font.family,
    fontSize: `${theme.font.size}px`,
    fontWeight: theme.font.weight,
  } : {};

  const subtitleStyle: React.CSSProperties = theme ? {
    fontFamily: theme.font.family,
    fontSize: `${Math.round(theme.font.size * 0.625)}px`,
    fontWeight: Math.max(400, theme.font.weight - 200),
  } : {};

  const avatarBorderStyle = `${config.styles.avatarBorderWidth}px solid ${config.styles.avatarBorderColor}`;

  return (
    <div
      className={`lowerthird ${animating ? "" : "animate-out"}`}
      style={containerStyle}
    >
      <div className={`avatar ${flipped ? "flip" : ""}`}>
        <div className="avatar-inner">
          <div className={`face front ${logoVisible ? "visible" : ""}`}>
            <img 
              src={finalLogoImage} 
              alt="Logo" 
              className={logoHasPadding ? "has-padding" : ""}
            />
          </div>
          {finalAvatarImage && (
            <div className="face back" style={{ border: avatarBorderStyle }}>
              <img src={finalAvatarImage} alt={title} />
            </div>
          )}
        </div>
      </div>

      <div className={`bar ${barVisible ? "show" : ""}`}>
        <div className={`text ${textVisible ? "show" : ""}`}>
          <div className="name" style={titleStyle}>{title}</div>
          {subtitle && (
            <div className="subtitle" style={subtitleStyle}>{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}
