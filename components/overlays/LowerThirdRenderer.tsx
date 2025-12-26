"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { LowerThirdShowPayload, LowerThirdAnimationConfig } from "@/lib/models/OverlayEvents";
import { LowerThirdDisplay } from "./LowerThirdDisplay";

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

  const ws = useRef<WebSocket | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleEvent = useCallback((data: { type: string; payload?: LowerThirdShowPayload; id: string }) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
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
              setTimeout(() => {
                setState((prev) => ({ ...prev, visible: false }));
              }, 500); // Wait for animation to complete
            }, data.payload.duration * 1000);
          }
        }
        break;
      case "hide":
        setState((prev) => ({ ...prev, animating: false }));
        setTimeout(() => {
          setState((prev) => ({ ...prev, visible: false }));
        }, 500); // Wait for animation to complete
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
    if (ws.current) {
      ws.current.send(
        JSON.stringify({
          type: "ack",
          eventId: data.id,
          channel: "lower",
          success: true,
        })
      );
    }
  }, []);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isMounted = true;

    const connect = () => {
      // Don't create new connection if component is unmounting
      if (!isMounted) return;

      // Close existing connection before creating new one
      if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
        try {
          ws.current.close();
        } catch {
          // Ignore close errors
        }
      }

      const wsUrl = `ws://${window.location.hostname}:3003`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        if (!isMounted) {
          ws.current?.close();
          return;
        }
        console.log("[LowerThird] Connected to WebSocket");
        ws.current?.send(
          JSON.stringify({
            type: "subscribe",
            channel: "lower",
          })
        );
      };

      const handleMessage = (event: MessageEvent) => {
        if (!isMounted) return;
        try {
          const message = JSON.parse(event.data);
          if (message.channel === "lower") {
            handleEvent(message.data);
          }
        } catch (error) {
          console.error("[LowerThird] Failed to parse message:", error);
        }
      };

      ws.current.onmessage = handleMessage;

      ws.current.onerror = (error) => {
        console.error("[LowerThird] WebSocket error:", error);
      };

      ws.current.onclose = (event) => {
        // Only auto-reconnect on unexpected disconnections
        // Code 1000 = normal closure, 1001 = going away (page navigation)
        if (isMounted && event.code !== 1000 && event.code !== 1001) {
          console.log("[LowerThird] WebSocket closed unexpectedly, reconnecting in 3s...");
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        } else {
          console.log("[LowerThird] WebSocket closed normally");
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        try {
          ws.current.close(1000, "Component unmounting");
        } catch {
          // Ignore close errors during cleanup
        }
      }
    };
  }, [handleEvent]);

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
      } : undefined}
      animationConfig={state.animationConfig}
      animating={state.animating}
      isPreview={false}
    />
  );
}
