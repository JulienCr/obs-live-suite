"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { PosterShowPayload } from "@/lib/models/OverlayEvents";
import { PosterDisplay } from "./PosterDisplay";
import "./poster.css";

interface PosterData {
  fileUrl: string;
  type: "image" | "video" | "youtube";
  offsetX?: number; // Horizontal offset from center (960px = center)
  aspectRatio?: number; // width/height ratio
  side: "left" | "right";
}

interface PosterState {
  visible: boolean;
  hiding: boolean;
  current: PosterData | null;
  previous: PosterData | null;
  transition: "fade" | "slide" | "cut" | "blur";
  side: "left" | "right";
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
    side: "left",
  });

  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    isMuted: true,
    currentTime: 0,
    duration: 0,
  });

  const [youtubePlayerReady, setYoutubePlayerReady] = useState(false);
  const youtubeStateRef = useRef({
    currentTime: 0,
    duration: 900,
    isPlaying: true,
    isMuted: true,
  });

  const ws = useRef<WebSocket | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const fadeOutTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const crossFadeTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeRef = useRef<HTMLIFrameElement | null>(null);

  // Function to detect aspect ratio of media
  const detectAspectRatio = useCallback((fileUrl: string, type: "image" | "video" | "youtube"): Promise<number> => {
    return new Promise((resolve) => {
      if (type === "youtube") {
        // YouTube videos are always 16:9
        resolve(16 / 9);
      } else if (type === "video") {
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
          // Use type from payload or fallback to extension detection
          const mediaType: "image" | "video" | "youtube" = data.payload.type || (
            data.payload.fileUrl.endsWith(".mp4") ||
            data.payload.fileUrl.endsWith(".webm") ||
            data.payload.fileUrl.endsWith(".mov")
              ? "video"
              : "image"
          );

          // Detect aspect ratio asynchronously
          detectAspectRatio(data.payload.fileUrl, mediaType).then((aspectRatio) => {
            const newPoster: PosterData = {
              fileUrl: data.payload!.fileUrl,
              type: mediaType,
              offsetX: data.payload!.theme?.layout?.x, // Extract horizontal offset from theme
              aspectRatio,
              side: data.payload!.side || "left",
            };

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
                  side: newPoster.side,
                };
              }
              
              // No current poster, just show the new one
              return {
                visible: true,
                hiding: false,
                current: newPoster,
                previous: null,
                transition: data.payload!.transition,
                side: newPoster.side,
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
        // Stop video/YouTube before hiding
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
        if (youtubeRef.current) {
          youtubeRef.current.contentWindow?.postMessage(
            '{"event":"command","func":"stopVideo","args":""}',
            '*'
          );
        }
        
        // Reset YouTube state
        youtubeStateRef.current = {
          currentTime: 0,
          duration: 900,
          isPlaying: false,
          isMuted: true,
        };
        
        // Start fade out animation
        setState((prev) => ({ ...prev, hiding: true }));
        // After fade completes, fully hide and clean up
        fadeOutTimeout.current = setTimeout(() => {
          setState((prev) => ({ ...prev, visible: false, hiding: false, current: null, previous: null }));
          
          // Clean up refs
          if (videoRef.current) {
            videoRef.current.src = '';
            videoRef.current.load();
          }
        }, 500); // Match fade duration
        break;
      case "play":
        if (videoRef.current) {
          videoRef.current.play();
        }
        if (youtubeRef.current) {
          youtubeRef.current.contentWindow?.postMessage(
            '{"event":"command","func":"playVideo","args":""}',
            '*'
          );
          youtubeStateRef.current.isPlaying = true;
        }
        setPlaybackState(prev => ({ ...prev, isPlaying: true }));
        break;
      case "pause":
        if (videoRef.current) {
          videoRef.current.pause();
        }
        if (youtubeRef.current) {
          youtubeRef.current.contentWindow?.postMessage(
            '{"event":"command","func":"pauseVideo","args":""}',
            '*'
          );
          youtubeStateRef.current.isPlaying = false;
        }
        setPlaybackState(prev => ({ ...prev, isPlaying: false }));
        break;
      case "seek":
        const seekTime = (data.payload as any)?.time || 0;
        if (videoRef.current) {
          videoRef.current.currentTime = seekTime;
        }
        if (youtubeRef.current) {
          youtubeRef.current.contentWindow?.postMessage(
            `{"event":"command","func":"seekTo","args":[${seekTime}, true]}`,
            '*'
          );
          youtubeStateRef.current.currentTime = seekTime;
        }
        setPlaybackState(prev => ({ ...prev, currentTime: seekTime }));
        break;
      case "mute":
        if (videoRef.current) {
          videoRef.current.muted = true;
        }
        if (youtubeRef.current) {
          youtubeRef.current.contentWindow?.postMessage(
            '{"event":"command","func":"mute","args":""}',
            '*'
          );
          youtubeStateRef.current.isMuted = true;
        }
        setPlaybackState(prev => ({ ...prev, isMuted: true }));
        break;
      case "unmute":
        if (videoRef.current) {
          videoRef.current.muted = false;
        }
        if (youtubeRef.current) {
          youtubeRef.current.contentWindow?.postMessage(
            '{"event":"command","func":"unMute","args":""}',
            '*'
          );
          youtubeStateRef.current.isMuted = false;
        }
        setPlaybackState(prev => ({ ...prev, isMuted: false }));
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

      const wsUrl = `ws://${window.location.hostname}:3003`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        if (!isMounted) {
          ws.current?.close();
          return;
        }
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
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
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

  // Send playback state updates for video/youtube
  useEffect(() => {
    if (!state.current || (state.current.type !== "video" && state.current.type !== "youtube")) {
      return;
    }

    const interval = setInterval(() => {
      if (state.current?.type === "video" && videoRef.current) {
        // For local videos, use standard HTML5 video API
        const currentTime = videoRef.current.currentTime || 0;
        const duration = videoRef.current.duration || 0;
        const isPlaying = !videoRef.current.paused;
        const isMuted = videoRef.current.muted;

        // Update state and send to backend
        setPlaybackState({ currentTime, duration, isPlaying, isMuted });

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: "state",
            channel: "poster",
            data: { currentTime, duration, isPlaying, isMuted }
          }));
        }
      }
      // For YouTube, state will be updated by message listener
    }, 1000);

    return () => clearInterval(interval);
  }, [state.current]);

  // Listen to YouTube player messages and send state updates
  useEffect(() => {
    if (!state.current || state.current.type !== "youtube") {
      return;
    }

    // Initialize from ref or defaults
    const currentYouTubeState = youtubeStateRef.current;

    // Send initial state immediately
    setPlaybackState(currentYouTubeState);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: "state",
        channel: "poster",
        data: currentYouTubeState
      }));
    }

    const handleYouTubeMessage = (event: MessageEvent) => {
      // Only process messages from YouTube
      if (typeof event.data !== 'string') return;
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === "onReady") {
          setYoutubePlayerReady(true);
          
          // Subscribe to state changes
          if (youtubeRef.current) {
            youtubeRef.current.contentWindow?.postMessage(
              '{"event":"listening","id":"poster-overlay","channel":"widget"}',
              '*'
            );
          }
        } else if (data.event === "infoDelivery" && data.info) {
          const info = data.info;
          
          // Update ref with real YouTube data
          if (info.currentTime !== undefined) youtubeStateRef.current.currentTime = info.currentTime;
          if (info.duration !== undefined) youtubeStateRef.current.duration = info.duration;
          if (info.playerState !== undefined) youtubeStateRef.current.isPlaying = info.playerState === 1;
          if (info.muted !== undefined) youtubeStateRef.current.isMuted = info.muted;
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    // Send state updates periodically
    const stateInterval = setInterval(() => {
      // Increment local time if playing
      if (youtubeStateRef.current.isPlaying) {
        youtubeStateRef.current.currentTime += 1;
      }
      
      setPlaybackState({...youtubeStateRef.current});

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: "state",
          channel: "poster",
          data: youtubeStateRef.current
        }));
      }
    }, 1000);

    window.addEventListener("message", handleYouTubeMessage);
    
    return () => {
      window.removeEventListener("message", handleYouTubeMessage);
      clearInterval(stateInterval);
    };
  }, [state.current]);

  if (!state.visible && !state.hiding) {
    return null;
  }

  const renderPoster = (posterData: PosterData, className: string) => {
    return (
      <div key={posterData.fileUrl} className={className}>
        <PosterDisplay
          fileUrl={posterData.fileUrl}
          type={posterData.type}
          aspectRatio={posterData.aspectRatio || 1}
          positioning="side"
          side={posterData.side}
          videoRef={posterData.type === "video" ? videoRef : undefined}
          youtubeRef={posterData.type === "youtube" ? youtubeRef : undefined}
        />
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

