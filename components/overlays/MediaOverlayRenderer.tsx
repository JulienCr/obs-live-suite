"use client";

import { useEffect, useRef, useState } from "react";
import { MediaItem, MediaType, MediaEventType } from "@/lib/models/Media";
import { timecodeToSeconds } from "@/lib/utils/media";

interface MediaOverlayRendererProps {
  instance: "A" | "B";
}

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function MediaOverlayRenderer({ instance }: MediaOverlayRendererProps) {
  const ws = useRef<WebSocket | null>(null);
  const [isOn, setIsOn] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [nextItem, setNextItem] = useState<MediaItem | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Player refs
  const ytPlayerRef = useRef<any>(null);
  const mp4PlayerRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const loopIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const channel = `media:${instance}`;

  /**
   * Load YouTube IFrame API
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  /**
   * Fetch initial state
   */
  useEffect(() => {
    fetchState();
  }, [instance]);

  const fetchState = async () => {
    try {
      const response = await fetch(`/api/media/${instance}/state`);
      if (response.ok) {
        const data = await response.json();
        setIsOn(data.playlist.on);
        setIsMuted(data.playlist.muted);
        setItems(data.playlist.items);
        setCurrentIndex(data.playlist.index);
        if (data.currentItem) {
          setCurrentItem(data.currentItem);
          preloadNextItem(data.playlist.items, data.playlist.index);
        }
      }
    } catch (err) {
      console.error("Failed to fetch media state:", err);
    }
  };

  /**
   * Preload next item
   */
  const preloadNextItem = (itemList: MediaItem[], index: number) => {
    if (itemList.length === 0) return;
    const nextIndex = (index + 1) % itemList.length;
    setNextItem(itemList[nextIndex]);
  };

  /**
   * WebSocket connection
   */
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:3003`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log(`[Media ${instance}] WebSocket connected`);
      ws.current?.send(
        JSON.stringify({
          type: "subscribe",
          channel,
        })
      );
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.channel === channel) {
        handleEvent(message.data);
      }
    };

    ws.current.onclose = (event) => {
      console.log(`[Media ${instance}] WebSocket closed:`, event.code);
      if (event.code !== 1000 && event.code !== 1001) {
        setTimeout(() => {
          console.log(`[Media ${instance}] Reconnecting...`);
          fetchState();
        }, 3000);
      }
    };

    ws.current.onerror = (error) => {
      console.error(`[Media ${instance}] WebSocket error:`, error);
    };

    return () => {
      ws.current?.close(1000, "Component unmounting");
    };
  }, [instance, channel]);

  /**
   * Handle WebSocket events
   */
  const handleEvent = (data: any) => {
    const { type, payload } = data;

    switch (type) {
      case MediaEventType.TOGGLE:
        setIsOn(payload.on);
        if (!payload.on) {
          cleanup();
        } else {
          // When turning on, refresh state to ensure we have current items
          fetchState();
        }
        break;

      case MediaEventType.NEXT:
        moveToNext();
        break;

      case MediaEventType.ADD_ITEM:
        setItems((prev) => [...prev, payload.item]);
        if (items.length === 0) {
          setCurrentItem(payload.item);
          setCurrentIndex(0);
        }
        break;

      case MediaEventType.UPDATE_ITEM:
        setItems((prev) =>
          prev.map((item) =>
            item.id === payload.id ? { ...item, ...payload.updates } : item
          )
        );
        if (currentItem?.id === payload.id) {
          setCurrentItem((prev) => (prev ? { ...prev, ...payload.updates } : null));
        }
        break;

      case MediaEventType.REMOVE_ITEM:
        setItems((prev) => {
          const newItems = prev.filter((item) => item.id !== payload.id);
          if (currentItem?.id === payload.id && newItems.length > 0) {
            const newIndex = Math.min(currentIndex, newItems.length - 1);
            setCurrentIndex(newIndex);
            setCurrentItem(newItems[newIndex]);
          } else if (newItems.length === 0) {
            setCurrentItem(null);
          }
          return newItems;
        });
        break;

      case MediaEventType.REORDER:
        setItems((prev) => {
          const reordered = payload.order.map((id: string) =>
            prev.find((item) => item.id === id)
          ).filter(Boolean) as MediaItem[];
          return reordered;
        });
        break;

      case MediaEventType.MUTE:
        setIsMuted(payload.muted);
        applyMute(payload.muted);
        break;

      default:
        console.warn(`[Media ${instance}] Unknown event type:`, type);
    }
  };

  /**
   * Move to next item
   */
  const moveToNext = () => {
    if (items.length === 0) return;
    cleanup();
    const newIndex = (currentIndex + 1) % items.length;
    setCurrentIndex(newIndex);
    setCurrentItem(items[newIndex]);
    preloadNextItem(items, newIndex);
  };

  /**
   * Apply mute state
   */
  const applyMute = (muted: boolean) => {
    if (ytPlayerRef.current) {
      if (muted) {
        ytPlayerRef.current.mute();
      } else {
        ytPlayerRef.current.unMute();
      }
    }
    if (mp4PlayerRef.current) {
      mp4PlayerRef.current.muted = muted;
    }
  };

  /**
   * Cleanup current player
   */
  const cleanup = () => {
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch (e) {
        console.error("Error destroying YouTube player:", e);
      }
      ytPlayerRef.current = null;
    }
    if (mp4PlayerRef.current) {
      mp4PlayerRef.current.pause();
      mp4PlayerRef.current.src = "";
      mp4PlayerRef.current = null;
    }
  };

  /**
   * Handle playback error
   */
  const handleError = (reason: string) => {
    setError(reason);
    console.error(`[Media ${instance}] Playback error:`, reason);

    // Send error event
    ws.current?.send(
      JSON.stringify({
        type: "publish",
        channel,
        data: {
          type: MediaEventType.ERROR,
          payload: {
            id: currentItem?.id,
            reason,
          },
        },
      })
    );

    // Auto-skip to next after error
    setTimeout(() => {
      setError(null);
      moveToNext();
    }, 2000);
  };

  // Debug logging
  useEffect(() => {
    console.log(`[Media ${instance}] State:`, {
      isOn,
      itemsCount: items.length,
      currentIndex,
      hasCurrentItem: !!currentItem,
      currentItemId: currentItem?.id,
    });
  }, [isOn, items.length, currentIndex, currentItem?.id, instance]);

  // Don't render if turned off
  if (!isOn) {
    return <div className="w-screen h-screen bg-transparent" />;
  }

  // Show message if on but no items
  if (!currentItem || items.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl font-bold opacity-50">
          No media items in playlist
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
          <div className="text-white text-2xl font-bold">
            Playback Error: {error}
          </div>
        </div>
      )}

      {currentItem.type === MediaType.YOUTUBE && (
        <YouTubePlayer
          item={currentItem}
          isMuted={isMuted}
          playerRef={ytPlayerRef}
          onError={handleError}
          onReady={() => {
            ws.current?.send(
              JSON.stringify({
                type: "publish",
                channel,
                data: {
                  type: MediaEventType.READY,
                  payload: { id: currentItem.id },
                },
              })
            );
          }}
        />
      )}

      {currentItem.type === MediaType.MP4 && (
        <MP4Player
          item={currentItem}
          isMuted={isMuted}
          playerRef={mp4PlayerRef}
          loopIntervalRef={loopIntervalRef}
          onError={handleError}
          onReady={() => {
            ws.current?.send(
              JSON.stringify({
                type: "publish",
                channel,
                data: {
                  type: MediaEventType.READY,
                  payload: { id: currentItem.id },
                },
              })
            );
          }}
        />
      )}

      {currentItem.type === MediaType.IMAGE && (
        <ImagePlayer
          item={currentItem}
          imageRef={imageRef}
          onError={handleError}
          onReady={() => {
            ws.current?.send(
              JSON.stringify({
                type: "publish",
                channel,
                data: {
                  type: MediaEventType.READY,
                  payload: { id: currentItem.id },
                },
              })
            );
          }}
        />
      )}

      {/* Unmute button (visible when audio is muted) */}
      {isMuted && (currentItem.type === MediaType.YOUTUBE || currentItem.type === MediaType.MP4) && (
        <button
          onClick={() => {
            fetch(`/api/media/${instance}/mute`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ muted: false }),
            });
          }}
          className="absolute bottom-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-all z-10"
        >
          Unmute
        </button>
      )}
    </div>
  );
}

/**
 * YouTube Player Component
 */
function YouTubePlayer({
  item,
  isMuted,
  playerRef,
  onError,
  onReady,
}: {
  item: MediaItem;
  isMuted: boolean;
  playerRef: React.MutableRefObject<any>;
  onError: (reason: string) => void;
  onReady: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ytReady, setYtReady] = useState(false);

  // Extract YouTube video ID
  const getVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = getVideoId(item.url);

  useEffect(() => {
    const checkYT = setInterval(() => {
      if (window.YT && window.YT.Player) {
        setYtReady(true);
        clearInterval(checkYT);
      }
    }, 100);

    return () => clearInterval(checkYT);
  }, []);

  useEffect(() => {
    if (!ytReady || !videoId || !containerRef.current) return;

    const start = item.start ? timecodeToSeconds(item.start) : undefined;
    const end = item.end ? timecodeToSeconds(item.end) : undefined;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        controls: 0,
        mute: isMuted ? 1 : 0,
        playsinline: 1,
        start: start || 0,
        end: end || 0,
        loop: 1,
        playlist: videoId, // Required for looping
      },
      events: {
        onReady: (event: any) => {
          event.target.playVideo();
          onReady();
        },
        onStateChange: (event: any) => {
          // Loop handling for segment
          if (event.data === window.YT.PlayerState.ENDED && start !== undefined && end !== undefined) {
            event.target.seekTo(start);
            event.target.playVideo();
          }
        },
        onError: (event: any) => {
          const errorMessages: { [key: number]: string } = {
            2: "Invalid video ID",
            5: "HTML5 player error",
            100: "Video not found",
            101: "Video not allowed to embed",
            150: "Video not allowed to embed",
          };
          onError(errorMessages[event.data] || `YouTube error code ${event.data}`);
        },
      },
    });

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying YouTube player:", e);
        }
        playerRef.current = null;
      }
    };
  }, [ytReady, videoId, item.start, item.end, isMuted]);

  if (!videoId) {
    onError("Invalid YouTube URL");
    return null;
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          aspectRatio: "16/9",
          objectFit: "cover",
        }}
      />
    </div>
  );
}

/**
 * MP4 Player Component
 */
function MP4Player({
  item,
  isMuted,
  playerRef,
  loopIntervalRef,
  onError,
  onReady,
}: {
  item: MediaItem;
  isMuted: boolean;
  playerRef: React.MutableRefObject<HTMLVideoElement | null>;
  loopIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  onError: (reason: string) => void;
  onReady: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = videoRef.current;
    const video = videoRef.current;

    const start = item.start ? timecodeToSeconds(item.start) : 0;
    const end = item.end ? timecodeToSeconds(item.end) : undefined;

    video.currentTime = start;
    video.muted = isMuted;

    const handleCanPlay = () => {
      video.play().catch((err) => {
        onError(`Autoplay failed: ${err.message}`);
      });
      onReady();
    };

    const handleTimeUpdate = () => {
      if (end && video.currentTime >= end) {
        video.currentTime = start;
        video.play();
      }
    };

    const handleError = () => {
      onError("Failed to load video");
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("error", handleError);
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
    };
  }, [item.url, item.start, item.end, isMuted]);

  return (
    <video
      ref={videoRef}
      src={item.url}
      className="w-full h-full object-cover"
      autoPlay
      muted={isMuted}
      playsInline
    />
  );
}

/**
 * Image Player Component
 */
function ImagePlayer({
  item,
  imageRef,
  onError,
  onReady,
}: {
  item: MediaItem;
  imageRef: React.MutableRefObject<HTMLImageElement | null>;
  onError: (reason: string) => void;
  onReady: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    imageRef.current = imgRef.current;
    const img = imgRef.current;

    const handleLoad = () => {
      onReady();
    };

    const handleError = () => {
      onError("Failed to load image");
    };

    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);

    return () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
  }, [item.url]);

  const zoom = item.zoom || 1.0;
  const panX = item.pan?.x || 0;
  const panY = item.pan?.y || 0;

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <img
        ref={imgRef}
        src={item.url}
        alt={item.title || "Media"}
        className="w-full h-full object-cover"
        style={{
          transform: `scale(${zoom}) translate(${panX}%, ${panY}%)`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
