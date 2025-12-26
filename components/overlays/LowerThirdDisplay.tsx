"use client";

import { useEffect, useState, useRef, useMemo, useLayoutEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { LowerThirdAnimationConfig } from "@/lib/models/OverlayEvents";
import { DEFAULT_LOGO_IMAGE } from "@/lib/config/lowerThirdDefaults";
import { ColorScheme, FontConfig, LayoutConfig, LowerThirdAnimationTheme } from "@/lib/models/Theme";
import "./lower-third.css";

export interface LowerThirdDisplayProps {
  title?: string;
  subtitle?: string;
  body?: string;
  contentType?: "guest" | "text";
  imageUrl?: string;
  imageAlt?: string;
  side?: "left" | "right" | "center";
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
  body,
  contentType,
  imageUrl,
  imageAlt,
  side = "left",
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
  const markdownRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wrapWidth, setWrapWidth] = useState(0);

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

  const centeredBottomOffset = 80;

  const containerStyle: React.CSSProperties = {
    ...cssVars,
    ...(isPreview ? {
      position: "relative" as const,
      left: "auto",
      bottom: "auto",
    } : {
      ...(side === "center" ? {
        left: "50%",
        bottom: `${centeredBottomOffset}px`,
        transform: `translateX(-50%) scale(${layout.scale})`,
        transformOrigin: "bottom center",
      } : {
        left: `${layout.x}px`,
        bottom: `${1080 - layout.y}px`,
        transform: `scale(${layout.scale})`,
        transformOrigin: "bottom left",
      }),
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
  const isTextMode = contentType === "text" || !!body;
  const markdownSource = body || title || "";
  const baseFontSize = theme?.font.size || 32;
  const baseFontWeight = theme?.font.weight || 700;
  const fontFamily = theme?.font.family || "sans-serif";
  const computeLineScale = (lineCount: number, maxLen: number) => {
    let scale = 1;
    if (lineCount >= 3) scale = 0.9;
    if (lineCount >= 4) scale = 0.8;
    if (lineCount >= 5) scale = 0.72;
    if (maxLen > 80) scale *= 0.85;
    else if (maxLen > 60) scale *= 0.92;
    return Math.max(0.6, scale);
  };

  const wrapMarkdownText = (
    text: string,
    width: number,
    scale: number
  ) => {
    const sanitized = (input: string) => input
      .replace(/!\[[^\]]*]\([^)]*\)/g, "")
      .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
      .replace(/[`*_~]/g, "")
      .replace(/^#{1,6}\s+/g, "")
      .replace(/^>\s+/g, "")
      .replace(/^\d+\.\s+/g, "")
      .replace(/^-\s+/g, "");

    const fontSize = Math.round(baseFontSize * scale);
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) {
      return { lines: text.split(/\r?\n/), maxLineLength: 0 };
    }
    ctx.font = `${baseFontWeight} ${fontSize}px ${fontFamily}`;

    const paragraphs = text.split(/\r?\n/);
    const lines: string[] = [];
    let maxLen = 0;

    paragraphs.forEach((paragraph) => {
      if (!paragraph.trim()) {
        lines.push("");
        return;
      }
      const words = paragraph.split(/\s+/).filter(Boolean);
      let current = "";
      words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        const candidateWidth = ctx.measureText(sanitized(candidate)).width;
        if (candidateWidth > width && current) {
          lines.push(current);
          maxLen = Math.max(maxLen, current.length);
          current = word;
        } else {
          current = candidate;
        }
      });
      if (current) {
        lines.push(current);
        maxLen = Math.max(maxLen, current.length);
      }
    });

    return { lines, maxLineLength: maxLen };
  };

  useLayoutEffect(() => {
    if (!markdownRef.current) return;
    const updateWidth = () => {
      const newWidth = markdownRef.current?.clientWidth || 0;
      setWrapWidth(newWidth);
    };
    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(markdownRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isTextMode, imageUrl]);

  const { wrappedLines, lineScale } = useMemo(() => {
    if (!isTextMode) {
      return { wrappedLines: [], lineScale: 1 };
    }
    if (!wrapWidth) {
      const fallbackLines = markdownSource.split(/\r?\n/);
      const maxLen = fallbackLines.reduce((max, line) => Math.max(max, line.length), 0);
      return {
        wrappedLines: fallbackLines.slice(0, 5),
        lineScale: computeLineScale(fallbackLines.length, maxLen),
      };
    }

    const firstPass = wrapMarkdownText(markdownSource, wrapWidth, 1);
    let scale = computeLineScale(firstPass.lines.length, firstPass.maxLineLength);
    let secondPass = wrapMarkdownText(markdownSource, wrapWidth, scale);
    const secondScale = computeLineScale(secondPass.lines.length, secondPass.maxLineLength);
    if (Math.abs(secondScale - scale) > 0.01) {
      scale = secondScale;
      secondPass = wrapMarkdownText(markdownSource, wrapWidth, scale);
    }

    return { wrappedLines: secondPass.lines, lineScale: scale };
  }, [isTextMode, markdownSource, wrapWidth, baseFontSize, baseFontWeight, fontFamily]);

  const markdownStyle: React.CSSProperties = {
    fontFamily,
    fontSize: `${Math.round(baseFontSize * lineScale)}px`,
    fontWeight: baseFontWeight,
    lineHeight: 1.25,
  };

  return (
    <div
      className={`lowerthird lowerthird--${side} ${isTextMode ? "lowerthird--text" : "lowerthird--guest"} ${animating ? "" : "animate-out"}`}
      style={containerStyle}
    >
      {!isTextMode && (
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
                <img src={finalAvatarImage} alt={title || "Guest"} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`bar ${barVisible ? "show" : ""}`}>
        {isTextMode && imageUrl && (
          <div className="lowerthird-media">
            <img src={imageUrl} alt={imageAlt || "Lower third image"} />
          </div>
        )}
        <div className={`text ${textVisible ? "show" : ""}`}>
          {isTextMode ? (
            <div className="lowerthird-markdown" ref={markdownRef} style={markdownStyle}>
              {wrappedLines.map((line, index) => (
                <div
                  key={`line-${index}`}
                  className="lowerthird-line"
                  style={{ "--lt-line-delay": `${index * 140}ms` } as React.CSSProperties}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {line || " "}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="name" style={titleStyle}>{title}</div>
              {subtitle && (
                <div className="subtitle" style={subtitleStyle}>{subtitle}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
