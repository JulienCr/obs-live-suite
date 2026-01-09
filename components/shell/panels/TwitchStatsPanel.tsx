"use client";

import { type IDockviewPanelProps } from "dockview-react";
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Eye, Radio, Clock, Gamepad2, AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiGet, apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { PanelColorMenu } from "../PanelColorMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TwitchStreamInfo, TwitchProviderStatus, TwitchEvent } from "@/lib/models/Twitch";

/**
 * TwitchStatsPanel - Displays Twitch stream statistics
 *
 * Features:
 * - Live/offline status
 * - Viewer count
 * - Stream title
 * - Game/category
 * - Uptime
 * - Provider status
 * - Auto-refresh via WebSocket
 */
export function TwitchStatsPanel(props: IDockviewPanelProps) {
  const t = useTranslations("dashboard.twitch");
  const tCommon = useTranslations("common");

  const [streamInfo, setStreamInfo] = useState<TwitchStreamInfo | null>(null);
  const [providerStatus, setProviderStatus] = useState<TwitchProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Handle WebSocket events
  const handleTwitchEvent = useCallback((data: TwitchEvent) => {
    if (data.type === "stream-info") {
      setStreamInfo(data.data);
      setError(null);
    } else if (data.type === "provider-changed") {
      setProviderStatus(data.data);
    } else if (data.type === "poll-error") {
      setError(data.data.error);
    }
  }, []);

  // Subscribe to Twitch WebSocket channel
  useWebSocketChannel<TwitchEvent>("twitch", handleTwitchEvent, {
    logPrefix: "TwitchStatsPanel",
  });

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both status and provider info
      const [statusResponse, providerResponse] = await Promise.all([
        apiGet<{ success: boolean; data: TwitchStreamInfo | null }>("/api/twitch/status"),
        apiGet<{ success: boolean; data: TwitchProviderStatus }>("/api/twitch/provider"),
      ]);

      if (statusResponse.success) {
        setStreamInfo(statusResponse.data);
      }
      if (providerResponse.success) {
        setProviderStatus(providerResponse.data);
      }
    } catch (err) {
      if (isClientFetchError(err)) {
        setError(err.errorMessage);
      } else {
        setError("Failed to fetch Twitch data");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await apiPost("/api/twitch/refresh");
      await fetchData();
    } catch (err) {
      if (isClientFetchError(err)) {
        setError(err.errorMessage);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get provider badge color
  const getProviderBadgeVariant = (): "default" | "secondary" | "destructive" => {
    if (!providerStatus) return "secondary";
    if (providerStatus.activeProvider === "none") return "destructive";
    return "default";
  };

  return (
    <PanelColorMenu panelId="twitchStats">
      <div
        data-panel-id="twitchStats"
        className="h-full overflow-auto p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-purple-500" />
            <span className="font-semibold">{t("stats.title")}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Provider status */}
            {providerStatus && (
              <Badge variant={getProviderBadgeVariant()} className="text-xs">
                {providerStatus.activeProvider === "streamerbot" && (
                  <Wifi className="h-3 w-3 mr-1" />
                )}
                {providerStatus.activeProvider === "twitch-api" && (
                  <Wifi className="h-3 w-3 mr-1" />
                )}
                {providerStatus.activeProvider === "none" && (
                  <WifiOff className="h-3 w-3 mr-1" />
                )}
                {providerStatus.activeProvider}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            {tCommon("loading")}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* No data state */}
        {!loading && !error && !streamInfo && (
          <div className="text-center py-8 text-muted-foreground">
            <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t("stats.noData")}</p>
            <p className="text-xs mt-1">{t("stats.checkProvider")}</p>
          </div>
        )}

        {/* Stream info */}
        {!loading && streamInfo && (
          <div className="space-y-4">
            {/* Live status */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  streamInfo.isLive ? "bg-red-500 animate-pulse" : "bg-gray-400"
                )}
              />
              <div className="flex-1">
                <div className="font-medium">
                  {streamInfo.isLive ? t("stats.live") : t("stats.offline")}
                </div>
                {streamInfo.broadcasterName && (
                  <div className="text-xs text-muted-foreground">
                    {streamInfo.broadcasterName}
                  </div>
                )}
              </div>
            </div>

            {/* Viewers */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground uppercase">
                  {t("stats.viewers")}
                </div>
                <div className="font-semibold text-lg">
                  {streamInfo.viewerCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Uptime (only if live) */}
            {streamInfo.isLive && streamInfo.uptimeSeconds !== null && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground uppercase">
                    {t("stats.uptime")}
                  </div>
                  <div className="font-semibold">
                    {formatUptime(streamInfo.uptimeSeconds)}
                  </div>
                </div>
              </div>
            )}

            {/* Title */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground uppercase mb-1">
                {t("stats.streamTitle")}
              </div>
              <div className="text-sm font-medium line-clamp-2">
                {streamInfo.title || t("stats.noTitle")}
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Gamepad2 className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground uppercase">
                  {t("stats.category")}
                </div>
                <div className="font-medium">
                  {streamInfo.category || t("stats.noCategory")}
                </div>
              </div>
            </div>

            {/* Polling status */}
            {providerStatus && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                {providerStatus.isPolling ? (
                  <span>
                    {t("stats.pollingActive", { interval: providerStatus.pollIntervalMs / 1000 })}
                  </span>
                ) : (
                  <span>{t("stats.pollingInactive")}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PanelColorMenu>
  );
}
