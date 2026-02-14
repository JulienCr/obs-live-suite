"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { LowerThirdShowPayload, LowerThirdAnimationConfig } from "@/lib/models/OverlayEvents";
import { LowerThirdDisplay } from "./LowerThirdDisplay";
import { OverlayMotionProvider } from "./OverlayMotionProvider";
import { LowerThirdAnimationTheme } from "@/lib/models/Theme";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";

interface ThemeData {
  colors: {
    primary: string;
    accent: string;
    surface: string;
    text: string;
    success: string;
    warn: string;
  };
  template?: string;
  font: {
    family: string;
    size: number;
    weight: number;
  };
  layout?: {
    x: number;
    y: number;
    scale: number;
    width?: number;
    height?: number;
  };
  lowerThirdAnimation?: LowerThirdAnimationTheme;
}

interface LowerThirdState {
  visible: boolean;
  animating: boolean;
  title?: string;
  subtitle?: string;
  body?: string;
  contentType?: "guest" | "text";
  imageUrl?: string;
  imageAlt?: string;
  side: "left" | "right" | "center";
  accentColor: string;
  avatarUrl?: string;
  logoImage?: string;
  avatarImage?: string;
  logoHasPadding?: boolean;
  animationConfig?: LowerThirdAnimationConfig;
  theme?: ThemeData;
}

/**
 * WebSocket message payload for lower third events
 */
interface LowerThirdEventData {
  type: string;
  payload?: LowerThirdShowPayload;
  id: string;
}

/**
 * LowerThirdRenderer displays lower third overlays
 */
export function LowerThirdRenderer() {
  const [state, setState] = useState<LowerThirdState>({
    visible: false,
    animating: false,
    title: "",
    subtitle: "",
    side: "left",
    accentColor: "#3b82f6",
  });

  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const visibilityTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const sendAckRef = useRef<(eventId: string) => void>(() => {});

  // Clean up all timeouts on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      if (visibilityTimeout.current) clearTimeout(visibilityTimeout.current);
    };
  }, []);

  const handleMessage = useCallback((data: LowerThirdEventData) => {
    // Clear all pending timeouts to prevent race conditions
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = undefined;
    }
    if (visibilityTimeout.current) {
      clearTimeout(visibilityTimeout.current);
      visibilityTimeout.current = undefined;
    }

    switch (data.type) {
      case "show":
        if (data.payload) {
          console.log("[LowerThird] Received show payload:", data.payload);
          console.log("[LowerThird] Has theme?", !!data.payload.theme);
          if (data.payload.theme) {
            console.log("[LowerThird] Theme data:", {
              colors: data.payload.theme.colors,
              font: data.payload.theme.font,
              layout: data.payload.theme.layout,
            });
          }
          setState({
            visible: true,
            animating: true,
            title: data.payload.title,
            subtitle: data.payload.subtitle,
            body: data.payload.body,
            contentType: data.payload.contentType,
            imageUrl: data.payload.imageUrl,
            imageAlt: data.payload.imageAlt,
            side: data.payload.side || "left",
            accentColor: data.payload.accentColor || data.payload.theme?.colors?.primary || "#3b82f6",
            avatarUrl: data.payload.avatarUrl,
            logoImage: data.payload.logoImage,
            avatarImage: data.payload.avatarImage || data.payload.avatarUrl,
            logoHasPadding: data.payload.logoHasPadding,
            animationConfig: data.payload.animationConfig,
            theme: data.payload.theme,
          });

          if (data.payload.duration) {
            hideTimeout.current = setTimeout(() => {
              setState((prev) => ({ ...prev, animating: false }));
              visibilityTimeout.current = setTimeout(() => {
                setState((prev) => ({ ...prev, visible: false }));
              }, 500); // Wait for exit animation to complete
            }, data.payload.duration * 1000);
          }
        }
        break;
      case "hide":
        setState((prev) => ({ ...prev, animating: false }));
        visibilityTimeout.current = setTimeout(() => {
          setState((prev) => ({ ...prev, visible: false }));
        }, 500); // Wait for exit animation to complete
        break;
      case "update":
        console.log("[LowerThird] Received update payload:", data.payload);
        setState((prev) => ({
          ...prev,
          ...data.payload,
          accentColor: data.payload?.accentColor || prev.accentColor,
          avatarUrl: data.payload?.avatarUrl !== undefined ? data.payload.avatarUrl : prev.avatarUrl,
          avatarImage: data.payload?.avatarImage !== undefined ? data.payload.avatarImage : prev.avatarImage,
          logoImage: data.payload?.logoImage !== undefined ? data.payload.logoImage : prev.logoImage,
          logoHasPadding: data.payload?.logoHasPadding !== undefined ? data.payload.logoHasPadding : prev.logoHasPadding,
          animationConfig: data.payload?.animationConfig || prev.animationConfig,
          body: data.payload?.body !== undefined ? data.payload.body : prev.body,
          contentType: data.payload?.contentType !== undefined ? data.payload.contentType : prev.contentType,
          imageUrl: data.payload?.imageUrl !== undefined ? data.payload.imageUrl : prev.imageUrl,
          imageAlt: data.payload?.imageAlt !== undefined ? data.payload.imageAlt : prev.imageAlt,
        }));
        break;
    }

    // Send acknowledgment
    sendAckRef.current(data.id);
  }, []);

  const { sendAck } = useWebSocketChannel<LowerThirdEventData>(
    "lower",
    handleMessage,
    { logPrefix: "LowerThird" }
  );

  // Keep ref up to date
  sendAckRef.current = sendAck;

  if (!state.visible) {
    return null;
  }

  console.log("[LowerThird] Rendering with theme:", {
    hasTheme: !!state.theme,
    colors: state.theme?.colors,
    font: state.theme?.font,
    layout: state.theme?.layout,
  });

  return (
    <OverlayMotionProvider>
      <LowerThirdDisplay
        title={state.title}
        subtitle={state.subtitle}
        body={state.body}
        contentType={state.contentType}
        imageUrl={state.imageUrl}
        imageAlt={state.imageAlt}
        logoImage={state.logoImage}
        avatarImage={state.avatarImage}
        logoHasPadding={state.logoHasPadding}
        accentColor={state.accentColor}
        side={state.side}
        theme={state.theme ? {
          colors: state.theme.colors,
          font: state.theme.font,
          layout: state.theme.layout || { x: 60, y: 920, scale: 1 },
          lowerThirdAnimation: state.theme.lowerThirdAnimation,
        } : undefined}
        animationConfig={state.animationConfig}
        animating={state.animating}
        isPreview={false}
      />
    </OverlayMotionProvider>
  );
}
