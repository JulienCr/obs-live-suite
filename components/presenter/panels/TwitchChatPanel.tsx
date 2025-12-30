"use client";

import { useState, useRef, useEffect } from "react";
import { RefreshCw, ExternalLink, MessageSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TwitchChatPanelProps {
  url?: string;
}

export function TwitchChatPanel({ url }: TwitchChatPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showStreamerBotWarning, setShowStreamerBotWarning] = useState(false);

  // Detect Streamer.bot overlay and check for potential WSS issues
  useEffect(() => {
    if (!url) return;

    const isStreamerBot = url.includes("chat.streamer.bot") || url.includes("streamer.bot/overlay");
    if (isStreamerBot) {
      try {
        // Try to decode the config to check if secure: false
        const configMatch = url.match(/config=([^&]+)/);
        if (configMatch) {
          const decoded = atob(configMatch[1]);
          const config = JSON.parse(decoded);
          if (config.secure === false) {
            setShowStreamerBotWarning(true);
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }, [url]);

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoaded(false);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleOpenNewTab = () => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  if (!url) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/50 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2" />
        <p className="text-sm">Twitch Chat URL not configured</p>
        <p className="text-xs mt-1">Configure it in the room settings</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Streamer.bot SSL Warning */}
      {showStreamerBotWarning && (
        <Alert variant="destructive" className="m-2 mb-0">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>WebSocket SSL Required:</strong> This Streamer.bot overlay uses insecure WebSocket (ws://).
            Enable SSL in Streamer.bot settings and regenerate the overlay URL with <code className="text-xs bg-background/50 px-1 rounded">secure: true</code>.
          </AlertDescription>
        </Alert>
      )}

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
          onClick={handleOpenNewTab}
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-muted-foreground text-sm">Loading chat...</div>
        </div>
      )}

      {/* Chat iframe */}
      <iframe
        ref={iframeRef}
        src={url}
        className="flex-1 w-full border-0"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}
