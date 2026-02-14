"use client";

import { useEffect, useState, useRef, useMemo, useLayoutEffect, useCallback } from "react";
import { m } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { LowerThirdAnimationConfig } from "@/lib/models/OverlayEvents";
import { DEFAULT_LOGO_IMAGE } from "@/lib/config/lowerThirdDefaults";
import { ColorScheme, FontConfig, LayoutConfig, LowerThirdAnimationTheme } from "@/lib/models/Theme";
import { waitForFont } from "@/lib/utils/fontLoader";
import "./lower-third.css";

// Standard broadcast width for consistent text wrapping calculations
const BROADCAST_WIDTH = 1920;

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
  viewportWidth?: number; // For preview viewport simulation
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
  viewportWidth: propViewportWidth,
}: LowerThirdDisplayProps) {
  // Animation state machine: idle -> logo -> flip -> bar -> text -> visible
  type AnimPhase = "idle" | "logo" | "flip" | "bar" | "text" | "visible";
  const [phase, setPhase] = useState<AnimPhase>("idle");

  const markdownRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wrapWidth, setWrapWidth] = useState(0);
  const [fontReady, setFontReady] = useState(false);

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
      freeTextMaxWidth: animationConfig?.styles?.freeTextMaxWidth ?? themeAnimation?.styles?.freeTextMaxWidth ?? {
        left: 65,
        right: 65,
        center: 90,
      },
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
  const finalAvatarImage = avatarImage || undefined; // Ensure empty string becomes undefined

  // Determine if there is an avatar to flip to
  const hasAvatar = !!finalAvatarImage;

  // Determine mode early - needed by animation state machine
  const isTextMode = contentType === "text" || !!body;

  // Animation state machine: when animating starts, kick off the sequence
  useEffect(() => {
    if (!animating) {
      // Don't reset phase on exit: FM elements stay in their visible state
      // while CSS .animate-out keyframes handle the sequenced exit visual.
      // Phase will be reset when a new show starts (animating=true).
      return;
    }

    // Reset and start the sequence
    setPhase("idle");
    // Small initial delay to ensure DOM is ready, then advance to first phase
    const initTimeout = setTimeout(() => {
      // In text mode, there's no avatar element to animate, so skip logo/flip
      // and start directly at bar phase
      if (isTextMode) {
        setPhase("bar");
      } else {
        setPhase("logo");
      }
    }, 50);

    return () => clearTimeout(initTimeout);
  }, [animating, isTextMode]);

  // Advance the state machine when each phase's animation completes
  const advancePhase = useCallback(() => {
    setPhase((current) => {
      switch (current) {
        case "logo":
          return hasAvatar ? "flip" : "bar"; // Skip flip if no avatar
        case "flip":
          return "bar";
        case "bar":
          return "text";
        case "text":
          return "visible";
        default:
          return current;
      }
    });
  }, [hasAvatar]);

  // The flip is a CSS transition (not Framer Motion), so we advance
  // from "flip" to "bar" after the CSS transition duration elapses
  useEffect(() => {
    if (phase !== "flip") return;
    const timer = setTimeout(() => {
      setPhase("bar");
    }, config.timing.flipDuration);
    return () => clearTimeout(timer);
  }, [phase, config.timing.flipDuration]);

  // Generate CSS variables - memoized to prevent re-render flicker
  const freeTextMaxWidth = config.styles.freeTextMaxWidth?.[side] ?? (side === 'center' ? 90 : 65);
  const centeredBottomOffset = 80;

  // Wrapper style with scale - separate from animated content
  const wrapperStyle = useMemo<React.CSSProperties>(() => {
    if (isPreview) {
      // Preview mode: use absolute positioning, NO layout.scale (preview container handles scaling)
      return {
        position: 'absolute' as const,
        ...(side === "center" ? {
          left: "50%",
          bottom: `${centeredBottomOffset}px`,
          transform: "translateX(-50%)",
          transformOrigin: "bottom center",
        } : side === "right" ? {
          right: `${layout.x}px`,
          bottom: `${1080 - layout.y}px`,
          // No transform scale in preview - the preview container scales everything
        } : {
          left: `${layout.x}px`,
          bottom: `${1080 - layout.y}px`,
          // No transform scale in preview - the preview container scales everything
        }),
      };
    }
    // Live overlay mode: use fixed positioning with layout scale
    return {
      position: 'fixed' as const,
      ...(side === "center" ? {
        left: "50%",
        bottom: `${centeredBottomOffset}px`,
        transform: `translateX(-50%) scale(${layout.scale})`,
        transformOrigin: "bottom center",
      } : side === "right" ? {
        right: `${layout.x}px`,
        bottom: `${1080 - layout.y}px`,
        transform: `scale(${layout.scale})`,
        transformOrigin: "bottom right",
      } : {
        left: `${layout.x}px`,
        bottom: `${1080 - layout.y}px`,
        transform: `scale(${layout.scale})`,
        transformOrigin: "bottom left",
      }),
    };
  }, [isPreview, side, layout.scale, layout.x, layout.y, centeredBottomOffset]);

  // Calculate CSS max-width in pixels based on broadcast width for consistency
  // Divide by layout.scale so the final scaled width matches the target
  // e.g., for center (90vw = 1728px) with scale 1.6: 1728/1.6 = 1080px base → 1080*1.6 = 1728px final
  const freeTextMaxWidthPx = (BROADCAST_WIDTH * freeTextMaxWidth) / 100 / layout.scale;

  // Container style - no transform here, just CSS variables
  const containerStyle = useMemo(() => ({
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
    '--lt-free-text-max-width': `${freeTextMaxWidthPx}px`,
    '--lt-avatar-border-width': `${config.styles.avatarBorderWidth}px`,
  }) as React.CSSProperties, [
    config.timing.logoFadeDuration, config.timing.logoScaleDuration,
    config.timing.flipDuration, config.timing.barExpandDuration,
    config.timing.textFadeDuration, config.styles.avatarBorderColor,
    config.styles.barBorderRadius, config.styles.barMinWidth,
    titleColor, subtitleColor, backgroundColor, freeTextMaxWidthPx,
    config.styles.avatarBorderWidth
  ]);

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
  const markdownSource = body || title || "";
  const baseFontSize = theme?.font.size || 32;
  const baseFontWeight = theme?.font.weight || 700;
  const fontFamily = theme?.font.family || "sans-serif";

  // Wait for custom font to load before calculating text wrapping
  useEffect(() => {
    const checkFont = async () => {
      if (!fontFamily || fontFamily === 'sans-serif') {
        setFontReady(true);
        return;
      }
      await waitForFont(fontFamily);
      setFontReady(true);
    };
    checkFont();
  }, [fontFamily]);

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
    // Strip markdown syntax for accurate width measurement
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

    // Extract first font family (before comma) and remove quotes for canvas
    const primaryFont = fontFamily.split(",")[0].trim().replace(/["']/g, "");
    ctx.font = `${baseFontWeight} ${fontSize}px "${primaryFont}"`;

    // Safety margin to account for canvas vs CSS rendering differences
    // Canvas measureText can be slightly less accurate than actual rendering
    // Using 1.5 character widths to be more conservative
    const safetyMargin = fontSize * 1.5;
    const effectiveWidth = width - safetyMargin;

    // Words that should not be left alone at end of line (French articles, prepositions, etc.)
    const noBreakAfter = new Set([
      "*", "-", "•", ":", ";", // Bullets and punctuation
      "à", "a", "au", "aux", "de", "des", "du", "d'", // French prepositions
      "le", "la", "les", "l'", "un", "une", // French articles
      "et", "ou", "en", "y", "ne", "n'", // French conjunctions/particles
      "the", "a", "an", "to", "of", "in", "on", "at", "by", // English articles/prepositions
    ]);

    // Check if a word should stay with the next word
    const shouldKeepWithNext = (word: string): boolean => {
      const lower = word.toLowerCase();
      // Single characters (except numbers)
      if (word.length === 1 && !/\d/.test(word)) return true;
      // Known no-break words
      if (noBreakAfter.has(lower)) return true;
      // Ends with apostrophe (like "d'", "l'", "n'")
      if (word.endsWith("'") || word.endsWith("'")) return true;
      return false;
    };

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
      let i = 0;

      while (i < words.length) {
        let word = words[i];

        // If this word should stay with the next, combine them
        while (i < words.length - 1 && shouldKeepWithNext(words[i])) {
          word = word + " " + words[i + 1];
          i++;
        }

        const candidate = current ? `${current} ${word}` : word;
        const candidateWidth = ctx.measureText(sanitized(candidate)).width;

        if (candidateWidth > effectiveWidth && current) {
          lines.push(current);
          maxLen = Math.max(maxLen, current.length);
          current = word;
        } else {
          current = candidate;
        }
        i++;
      }

      if (current) {
        lines.push(current);
        maxLen = Math.max(maxLen, current.length);
      }
    });

    return { lines, maxLineLength: maxLen };
  };

  // Calculate target width from theme config (in vw)
  // Uses BROADCAST_WIDTH (1920px) for consistent text wrapping
  // Divides by layout.scale since the content is scaled up - we need to wrap at narrower width
  const targetWidth = useMemo(() => {
    if (!isTextMode) return 0;

    const vwValue = freeTextMaxWidth; // Already calculated: 90 for center, 65 for left/right
    // Convert vw to pixels: 1vw = viewport width / 100
    // Use provided viewport width, or default to broadcast standard (1920px)
    const viewportWidth = propViewportWidth ?? BROADCAST_WIDTH;
    const widthInPixels = (viewportWidth * vwValue) / 100;

    // Account for bar padding (16px left + 20px right = 36px) and text padding
    // The markdown wrapper needs the full bar width minus its internal padding
    const textContainerPadding = 40; // Total horizontal padding in .bar

    // Divide by scale since the content will be scaled up
    // This ensures the final scaled width fits within the target
    const scale = isPreview ? 1 : layout.scale;
    return (widthInPixels - textContainerPadding) / scale;
  }, [isTextMode, freeTextMaxWidth, propViewportWidth, isPreview, layout.scale]);

  useLayoutEffect(() => {
    if (!isTextMode) return;

    // Use calculated target width immediately
    // No need for resize listener since we use fixed BROADCAST_WIDTH
    setWrapWidth(targetWidth);
  }, [isTextMode, targetWidth]);

  const { wrappedLines, lineScale } = useMemo(() => {
    if (!isTextMode || !wrapWidth || !fontReady) {
      return { wrappedLines: [], lineScale: 1 };
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
  }, [isTextMode, markdownSource, wrapWidth, baseFontSize, baseFontWeight, fontFamily, fontReady]);

  const markdownStyle: React.CSSProperties = {
    fontFamily,
    fontSize: `${Math.round(baseFontSize * lineScale)}px`,
    fontWeight: baseFontWeight,
    lineHeight: 1.25,
  };

  // Derived boolean states from phase for cleaner rendering
  const logoVisible = phase !== "idle";
  const flipped = hasAvatar && (phase === "flip" || phase === "bar" || phase === "text" || phase === "visible");
  const barVisible = phase === "bar" || phase === "text" || phase === "visible";
  const textVisible = phase === "text" || phase === "visible";

  return (
    <div style={wrapperStyle}>
      <div
        className={`lowerthird lowerthird--${side} ${isTextMode ? "lowerthird--text" : "lowerthird--guest"} ${animating ? "" : "animate-out"}`}
        style={containerStyle}
      >
      {!isTextMode && (
        <m.div
          className={`avatar ${flipped ? "flip" : ""}`}
          initial={{ opacity: 0, scale: 1.6 }}
          animate={logoVisible
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 1.6 }
          }
          transition={{
            opacity: { duration: config.timing.logoFadeDuration / 1000 },
            scale: { duration: config.timing.logoScaleDuration / 1000 },
          }}
          onAnimationComplete={() => {
            // Only advance from logo phase when animation finishes
            if (phase === "logo") {
              advancePhase();
            }
          }}
        >
          <div className="avatar-inner">
            <div className="face front visible">
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
        </m.div>
      )}

      {isTextMode && imageUrl && (
        <m.div
          className="lowerthird-media"
          initial={{ opacity: 0, y: 10 }}
          animate={barVisible
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 10 }
          }
          transition={{ duration: 0.3 }}
        >
          <img src={imageUrl} alt={imageAlt || "Lower third image"} />
        </m.div>
      )}

      <m.div
        className="bar"
        initial={{ scaleX: 0 }}
        animate={barVisible
          ? { scaleX: 1 }
          : { scaleX: 0 }
        }
        transition={{
          duration: config.timing.barExpandDuration / 1000,
          ease: [0.16, 1, 0.3, 1],
        }}
        onAnimationComplete={() => {
          // Advance from bar to text phase when bar expansion finishes
          if (phase === "bar") {
            advancePhase();
          }
        }}
      >
        <m.div
          className="text"
          initial={{ opacity: 0, x: side === "right" ? 10 : -10 }}
          animate={textVisible
            ? { opacity: 1, x: 0 }
            : { opacity: 0, x: side === "right" ? 10 : -10 }
          }
          transition={{
            opacity: { duration: config.timing.textFadeDuration / 1000 },
            x: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
          }}
          onAnimationComplete={() => {
            // Advance from text to visible phase when text animation finishes
            if (phase === "text") {
              advancePhase();
            }
          }}
        >
          {isTextMode ? (
            <div className="lowerthird-markdown" ref={markdownRef} style={markdownStyle}>
              {wrappedLines.map((line, index) => (
                <m.div
                  key={`line-${index}`}
                  className="lowerthird-line"
                  initial={{ opacity: 0, y: 6 }}
                  animate={textVisible
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 6 }
                  }
                  transition={{
                    duration: config.timing.textFadeDuration / 1000,
                    delay: index * 0.14,
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {line || " "}
                  </ReactMarkdown>
                </m.div>
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
        </m.div>
      </m.div>
    </div>
    </div>
  );
}
