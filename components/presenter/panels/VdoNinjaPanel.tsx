"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, Volume2, VolumeX, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VdoNinjaPanelProps {
  url?: string;
}

export function VdoNinjaPanel({ url }: VdoNinjaPanelProps) {
  const t = useTranslations("presenter.vdoNinja");
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
    // Open the original VDO.ninja URL (not local) in a new tab
    // This allows the user to access the HTTPS version if needed
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
        <p className="text-sm">{t("notConfigured")}</p>
        <p className="text-xs mt-1">{t("configureInSettings")}</p>
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
          title={t("refresh")}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleMuteToggle}
          title={isMuted ? t("unmute") : t("mute")}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleOpenNewTab}
          title={t("openInNewTab")}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading/Error state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-muted-foreground text-sm">{t("loadingVideo")}</div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
          <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
          <p className="text-sm text-destructive">{t("failedToLoad")}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
            {t("tryAgain")}
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
