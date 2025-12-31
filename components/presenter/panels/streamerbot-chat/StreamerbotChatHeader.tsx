"use client";

import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Search, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  StreamerbotChatHeaderProps,
  StreamerbotConnectionStatus,
} from "./types";

/**
 * Get connection status color class
 */
function getStatusColor(status: StreamerbotConnectionStatus): string {
  switch (status) {
    case StreamerbotConnectionStatus.CONNECTED:
      return "text-green-500";
    case StreamerbotConnectionStatus.CONNECTING:
    case StreamerbotConnectionStatus.AUTHENTICATING:
      return "text-yellow-500";
    case StreamerbotConnectionStatus.ERROR:
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Get human-readable status text
 */
function getStatusText(
  status: StreamerbotConnectionStatus,
  errorMessage?: string
): string {
  switch (status) {
    case StreamerbotConnectionStatus.CONNECTED:
      return "Connected";
    case StreamerbotConnectionStatus.CONNECTING:
      return "Connecting...";
    case StreamerbotConnectionStatus.AUTHENTICATING:
      return "Authenticating...";
    case StreamerbotConnectionStatus.ERROR:
      return errorMessage || "Error";
    default:
      return "Disconnected";
  }
}

/**
 * Header component with connection status and controls
 */
export function StreamerbotChatHeader({
  status,
  error,
  messageCount,
  showSearch,
  onToggleSearch,
  onClearMessages,
  onConnect,
  onDisconnect,
}: StreamerbotChatHeaderProps) {
  const statusColor = getStatusColor(status);
  const statusText = getStatusText(status, error?.message);

  return (
    <div className="flex-shrink-0 h-10 px-3 flex items-center justify-between border-b bg-card">
      <div className="flex items-center gap-2">
        {/* Connection status */}
        <div className={cn("flex items-center gap-1.5", statusColor)}>
          {status === StreamerbotConnectionStatus.CONNECTED ? (
            <Wifi className="h-4 w-4" />
          ) : status === StreamerbotConnectionStatus.CONNECTING ||
            status === StreamerbotConnectionStatus.AUTHENTICATING ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span className="text-xs">{statusText}</span>
        </div>

        {/* Message count */}
        <span className="text-xs text-muted-foreground">({messageCount})</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Search toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleSearch}
        >
          <Search className="h-3.5 w-3.5" />
        </Button>

        {/* Clear messages */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClearMessages}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        {/* Connect/Disconnect */}
        {status === StreamerbotConnectionStatus.CONNECTED ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onDisconnect}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onConnect}
            disabled={status === StreamerbotConnectionStatus.CONNECTING}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
