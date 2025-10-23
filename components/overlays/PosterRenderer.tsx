"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { PosterShowPayload } from "@/lib/models/OverlayEvents";
import "./poster.css";

interface PosterData {
  fileUrl: string;
  isVideo: boolean;
  offsetX?: number; // Horizontal offset from center (960px = center)
  aspectRatio?: number; // width/height ratio
}

interface PosterState {
  visible: boolean;
  hiding: boolean;
  current: PosterData | null;
  previous: PosterData | null;
  transition: "fade" | "slide" | "cut" | "blur";
}

/**
 * PosterRenderer displays poster/image overlays with cross-fade support
 */
export function PosterRenderer() {
  const [state, setState] = useState<PosterState>({
    visible: false,
    hiding: false,
    current: null,
    previous: null,
    transition: "fade",
  });

  const ws = useRef<WebSocket | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const fadeOutTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const crossFadeTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // Function to detect aspect ratio of media
  const detectAspectRatio = useCallback((fileUrl: string, isVideo: boolean): Promise<number> => {
    return new Promise((resolve) => {
      if (isVideo) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          const aspectRatio = video.videoWidth / video.videoHeight;
          resolve(aspectRatio);
        };
        video.onerror = () => resolve(1); // Default to square if error
        video.src = fileUrl;
      } else {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          resolve(aspectRatio);
        };
        img.onerror = () => resolve(1); // Default to square if error
        img.src = fileUrl;
      }
    });
  }, []);

  const handleEvent = useCallback((data: { type: string; payload?: PosterShowPayload; id: string }) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }
    if (fadeOutTimeout.current) {
      clearTimeout(fadeOutTimeout.current);
    }
    if (crossFadeTimeout.current) {
      clearTimeout(crossFadeTimeout.current);
    }

    switch (data.type) {
      case "show":
        if (data.payload) {
          const isVideo =
            data.payload.fileUrl.endsWith(".mp4") ||
            data.payload.fileUrl.endsWith(".webm") ||
            data.payload.fileUrl.endsWith(".mov");

          // Detect aspect ratio asynchronously
          detectAspectRatio(data.payload.fileUrl, isVideo).then((aspectRatio) => {
            const newPoster: PosterData = {
              fileUrl: data.payload!.fileUrl,
              isVideo,
              offsetX: data.payload!.theme?.layout?.x, // Extract horizontal offset from theme
              aspectRatio,
            };
            
            console.log("[PosterRenderer] Received theme data:", data.payload!.theme);
            console.log("[PosterRenderer] Offset X:", newPoster.offsetX);
            console.log("[PosterRenderer] Aspect ratio:", aspectRatio, isVideo ? "(video)" : "(image)");

            setState((prev) => {
              // Cross-fade: move current to previous if there's a current poster
              if (prev.visible && prev.current) {
                // Clear previous after cross-fade completes
                crossFadeTimeout.current = setTimeout(() => {
                  setState((s) => ({ ...s, previous: null }));
                }, 500); // Match fade duration
                
                return {
                  visible: true,
                  hiding: false,
                  current: newPoster,
                  previous: prev.current,
                  transition: data.payload!.transition,
                };
              }
              
              // No current poster, just show the new one
              return {
                visible: true,
                hiding: false,
                current: newPoster,
                previous: null,
                transition: data.payload!.transition,
              };
            });

            if (data.payload!.duration) {
              hideTimeout.current = setTimeout(() => {
                // Start fade out animation
                setState((prev) => ({ ...prev, hiding: true }));
                // After fade completes, fully hide
                fadeOutTimeout.current = setTimeout(() => {
                  setState((prev) => ({ ...prev, visible: false, hiding: false, current: null, previous: null }));
                }, 500); // Match fade duration
              }, data.payload!.duration * 1000);
            }
          });
        }
        break;
      case "hide":
        // Start fade out animation
        setState((prev) => ({ ...prev, hiding: true }));
        // After fade completes, fully hide
        fadeOutTimeout.current = setTimeout(() => {
          setState((prev) => ({ ...prev, visible: false, hiding: false, current: null, previous: null }));
        }, 500); // Match fade duration
        break;
    }

    // Send acknowledgment
    if (ws.current) {
      ws.current.send(
        JSON.stringify({
          type: "ack",
          eventId: data.id,
          channel: "poster",
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

      const wsUrl = `ws://${window.location.hostname}:3001`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        if (!isMounted) {
          ws.current?.close();
          return;
        }
        console.log("[Poster] Connected to WebSocket");
        ws.current?.send(
          JSON.stringify({
            type: "subscribe",
            channel: "poster",
          })
        );
      };

      const handleMessage = (event: MessageEvent) => {
        if (!isMounted) return;
        try {
          const message = JSON.parse(event.data);
          if (message.channel === "poster") {
            handleEvent(message.data);
          }
        } catch (error) {
          console.error("[Poster] Failed to parse message:", error);
        }
      };

      ws.current.onmessage = handleMessage;

      ws.current.onerror = (error) => {
        console.error("[Poster] WebSocket error:", error);
      };

      ws.current.onclose = (event) => {
        // Only auto-reconnect on unexpected disconnections
        // Code 1000 = normal closure, 1001 = going away (page navigation)
        if (isMounted && event.code !== 1000 && event.code !== 1001) {
          console.log("[Poster] WebSocket closed unexpectedly, reconnecting in 3s...");
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        } else {
          console.log("[Poster] WebSocket closed normally");
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
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
      if (fadeOutTimeout.current) {
        clearTimeout(fadeOutTimeout.current);
      }
      if (crossFadeTimeout.current) {
        clearTimeout(crossFadeTimeout.current);
      }
    };
  }, [handleEvent]);

  if (!state.visible && !state.hiding) {
    return null;
  }

  const renderPoster = (posterData: PosterData, className: string) => {
    console.log("[PosterRenderer] Rendering with offsetX:", posterData.offsetX, "- FORCING LEFT ALIGNMENT");
    console.log("[PosterRenderer] Aspect ratio:", posterData.aspectRatio);
    
    // Determine if this is a landscape image (aspect ratio > 1.2)
    const isLandscape = posterData.aspectRatio && posterData.aspectRatio > 1.2;
    
    // Apply different constraints and positioning based on aspect ratio
    const mediaStyle: React.CSSProperties = {
      position: 'absolute',
      objectFit: 'contain',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      borderRadius: '8px',
      // Different positioning and sizing for landscape vs portrait
      ...(isLandscape ? {
        // Landscape: bottom left positioning
        left: '30px',
        bottom: '30px',
        top: 'auto',
        transform: 'none',
        maxWidth: '35%', // Much smaller width for landscape - max 35% of canvas
        maxHeight: '40%', // Smaller height since it's at bottom
      } : {
        // Portrait/Square: center left positioning (original)
        left: '30px',
        top: '50%',
        bottom: 'auto',
        transform: 'translate(0%, -50%)',
        maxWidth: '90%', // Original width for portrait/square
        maxHeight: '90%', // Original height for portrait/square
      }),
    };
    
    return (
      <div 
        key={posterData.fileUrl} 
        className={className}
      >
        {posterData.isVideo ? (
          <video
            style={mediaStyle}
            src={posterData.fileUrl}
            autoPlay
            loop
            muted
            aria-label="Poster video"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            style={mediaStyle}
            src={posterData.fileUrl}
            alt="Poster"
          />
        )}
      </div>
    );
  };

  return (
    <div className={`poster-container ${state.hiding ? 'poster-hiding' : ''}`}>
      {/* Previous poster fading out */}
      {state.previous && renderPoster(state.previous, 'poster-layer poster-crossfade-out')}
      
      {/* Current poster */}
      {state.current && renderPoster(
        state.current, 
        `poster-layer poster-transition-${state.transition} ${state.previous ? 'poster-crossfade-in' : ''}`
      )}
    </div>
  );
}

