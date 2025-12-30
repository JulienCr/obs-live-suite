"use client";

import { useState, useRef } from "react";
import { RefreshCw, Volume2, VolumeX, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VdoNinjaPanelProps {
  url?: string;
}

export function VdoNinjaPanel({ url }: VdoNinjaPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleRefresh = () => {
    if (iframeRef.current) {
      setHasError(false);
      setIsLoaded(false);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleMuteToggle = () => {
    // Note: Due to iframe limitations, this may not work for all VDO.Ninja configurations
    setIsMuted(!isMuted);
  };

  const handleOpenNewTab = () => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  if (!url) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/50 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-sm">VDO.Ninja URL not configured</p>
        <p className="text-xs mt-1">Configure it in the room settings</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleRefresh}
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleMuteToggle}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleOpenNewTab}
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading/Error state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-muted-foreground text-sm">Loading video...</div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
          <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
          <p className="text-sm text-destructive">Failed to load video</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      )}

      {/* Video iframe */}
      <iframe
        ref={iframeRef}
        src={url}
        className={cn(
          "flex-1 w-full border-0",
          !isLoaded && "invisible"
        )}
        allow="camera; microphone; autoplay; fullscreen"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
