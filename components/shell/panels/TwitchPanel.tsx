"use client";

import { type IDockviewPanelProps } from "dockview-react";
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  Radio,
  Clock,
  Gamepad2,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Pencil,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiGet, apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { TwitchCategoryPicker } from "@/components/twitch/TwitchCategoryPicker";
import type {
  TwitchStreamInfo,
  TwitchProviderStatus,
  TwitchEvent,
  TwitchCategory,
} from "@/lib/models/Twitch";

const config: PanelConfig = { id: "twitch", context: "dashboard" };

/**
 * TwitchPanel - Unified Twitch panel with stats and editing
 *
 * Features:
 * - Live/offline status
 * - Viewer count
 * - Stream title (editable)
 * - Game/category (editable with picker)
 * - Uptime
 * - Provider status
 * - Auto-refresh via WebSocket
 */
export function TwitchPanel(_props: IDockviewPanelProps) {
  const t = useTranslations("dashboard.twitch");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  const [streamInfo, setStreamInfo] = useState<TwitchStreamInfo | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<TwitchProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<TwitchCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Handle WebSocket events
  const handleTwitchEvent = useCallback(
    (data: TwitchEvent) => {
      if (data.type === "stream-info") {
        setStreamInfo(data.data);
        setError(null);
        // Only update edit fields if not in edit mode or no changes
        if (!editMode || !hasChanges) {
          setEditTitle(data.data.title);
          setEditCategory({
            id: data.data.categoryId,
            name: data.data.category,
          });
        }
      } else if (data.type === "provider-changed") {
        setProviderStatus(data.data);
      } else if (data.type === "poll-error") {
        setError(data.data.error);
      }
    },
    [editMode, hasChanges]
  );

  // Subscribe to Twitch WebSocket channel
  useWebSocketChannel<TwitchEvent>("twitch", handleTwitchEvent, {
    logPrefix: "TwitchPanel",
  });

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Track changes
  useEffect(() => {
    if (!streamInfo) {
      setHasChanges(false);
      return;
    }
    const titleChanged = editTitle !== streamInfo.title;
    const categoryChanged =
      editCategory?.id !== streamInfo.categoryId && editCategory?.id !== "";
    setHasChanges(titleChanged || categoryChanged);
  }, [editTitle, editCategory, streamInfo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both status and provider info
      const [statusResponse, providerResponse] = await Promise.all([
        apiGet<{ success: boolean; data: TwitchStreamInfo | null }>(
          "/api/twitch/status"
        ),
        apiGet<{ success: boolean; data: TwitchProviderStatus }>(
          "/api/twitch/provider"
        ),
      ]);

      if (statusResponse.success && statusResponse.data) {
        setStreamInfo(statusResponse.data);
        setEditTitle(statusResponse.data.title);
        setEditCategory({
          id: statusResponse.data.categoryId,
          name: statusResponse.data.category,
        });
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

  const handleSave = async () => {
    if (!hasChanges || !streamInfo) return;

    try {
      setSaving(true);
      setError(null);

      const updateData: { title?: string; categoryId?: string } = {};

      if (editTitle !== streamInfo.title) {
        updateData.title = editTitle;
      }
      if (editCategory?.id && editCategory.id !== streamInfo.categoryId) {
        updateData.categoryId = editCategory.id;
      }

      const response = await apiPost<{
        success: boolean;
        data: TwitchStreamInfo;
        error?: string;
      }>("/api/twitch/update", updateData);

      if (response.success) {
        setStreamInfo(response.data);
        setEditTitle(response.data.title);
        setEditCategory({
          id: response.data.categoryId,
          name: response.data.category,
        });
        setHasChanges(false);
        setEditMode(false);
        toast({
          title: t("updateSuccess"),
          description: t("updateSuccessDesc"),
        });
      } else {
        throw new Error(response.error || "Update failed");
      }
    } catch (err) {
      const errorMessage = isClientFetchError(err)
        ? err.errorMessage
        : err instanceof Error
          ? err.message
          : "Failed to update stream info";

      setError(errorMessage);
      toast({
        title: t("updateError"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (streamInfo) {
      setEditTitle(streamInfo.title);
      setEditCategory({
        id: streamInfo.categoryId,
        name: streamInfo.category,
      });
    }
    setHasChanges(false);
    setEditMode(false);
  };

  const toggleEditMode = () => {
    if (editMode) {
      handleCancel();
    } else {
      setEditMode(true);
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
  const getProviderBadgeVariant = ():
    | "default"
    | "secondary"
    | "destructive" => {
    if (!providerStatus) return "secondary";
    if (providerStatus.activeProvider === "none") return "destructive";
    return "default";
  };

  return (
    <BasePanelWrapper config={config}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-purple-500" />
          <span className="font-semibold">{t("title")}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Provider status */}
          {providerStatus && (
            <Badge variant={getProviderBadgeVariant()} className="text-xs">
              {providerStatus.activeProvider === "twitch-api" ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {providerStatus.activeProvider}
            </Badge>
          )}
          {/* Edit toggle */}
          {streamInfo && (
            <Button
              variant={editMode ? "secondary" : "ghost"}
              size="icon"
              onClick={toggleEditMode}
              className="h-8 w-8"
              title={editMode ? t("cancelEdit") : t("edit")}
            >
              {editMode ? (
                <X className="h-4 w-4" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
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
          <AlertCircle className="h-4 w-4 shrink-0" />
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
        <div className="space-y-3">
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

          {/* Viewers and Uptime row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Viewers */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("stats.viewers")}
                </div>
                <div className="font-semibold">
                  {streamInfo.viewerCount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Uptime */}
            {streamInfo.isLive && streamInfo.uptimeSeconds !== null && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">
                    {t("stats.uptime")}
                  </div>
                  <div className="font-semibold">
                    {formatUptime(streamInfo.uptimeSeconds)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground uppercase mb-1">
              {t("stats.streamTitle")}
            </div>
            {editMode ? (
              <div className="space-y-1">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  maxLength={140}
                  className="h-8"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {editTitle.length}/140
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium line-clamp-2">
                {streamInfo.title || t("stats.noTitle")}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground uppercase mb-1">
              {t("stats.category")}
            </div>
            {editMode ? (
              <TwitchCategoryPicker
                value={editCategory}
                onChange={setEditCategory}
                disabled={saving}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {streamInfo.category || t("stats.noCategory")}
                </span>
              </div>
            )}
          </div>

          {/* Edit mode actions */}
          {editMode && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="flex-1"
                size="sm"
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="flex-1"
                size="sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {tCommon("saving")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {tCommon("save")}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Unsaved changes indicator */}
          {editMode && hasChanges && (
            <p className="text-xs text-amber-500 text-center">
              {t("unsavedChanges")}
            </p>
          )}

          {/* Polling status */}
          {providerStatus && !editMode && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              {providerStatus.isPolling ? (
                <span>
                  {t("stats.pollingActive", {
                    interval: providerStatus.pollIntervalMs / 1000,
                  })}
                </span>
              ) : (
                <span>{t("stats.pollingInactive")}</span>
              )}
            </div>
          )}
        </div>
      )}
    </BasePanelWrapper>
  );
}
