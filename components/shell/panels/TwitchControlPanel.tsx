"use client";

import { type IDockviewPanelProps } from "dockview-react";
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Save, Loader2, AlertCircle, RefreshCw, Gamepad2 } from "lucide-react";
import { apiGet, apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { PanelColorMenu } from "../PanelColorMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { TwitchStreamInfo, TwitchEvent } from "@/lib/models/Twitch";

/**
 * TwitchControlPanel - Edit stream title and category
 *
 * Features:
 * - Edit stream title
 * - Edit game/category
 * - Real-time sync with current values
 * - Save with feedback
 */
export function TwitchControlPanel(props: IDockviewPanelProps) {
  const t = useTranslations("dashboard.twitch");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  const [streamInfo, setStreamInfo] = useState<TwitchStreamInfo | null>(null);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Handle WebSocket events for live sync
  const handleTwitchEvent = useCallback((data: TwitchEvent) => {
    if (data.type === "stream-info") {
      setStreamInfo(data.data);
      // Only update form if no unsaved changes
      if (!hasChanges) {
        setTitle(data.data.title);
        setCategoryId(data.data.categoryId);
        setCategoryName(data.data.category);
      }
    }
  }, [hasChanges]);

  // Subscribe to Twitch WebSocket channel
  useWebSocketChannel<TwitchEvent>("twitch", handleTwitchEvent, {
    logPrefix: "TwitchControlPanel",
  });

  // Initial fetch
  useEffect(() => {
    fetchStreamInfo();
  }, []);

  // Track changes
  useEffect(() => {
    if (!streamInfo) {
      setHasChanges(false);
      return;
    }
    const titleChanged = title !== streamInfo.title;
    const categoryChanged = categoryId !== streamInfo.categoryId && categoryId !== "";
    setHasChanges(titleChanged || categoryChanged);
  }, [title, categoryId, streamInfo]);

  const fetchStreamInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiGet<{ success: boolean; data: TwitchStreamInfo | null }>(
        "/api/twitch/status"
      );

      if (response.success && response.data) {
        setStreamInfo(response.data);
        setTitle(response.data.title);
        setCategoryId(response.data.categoryId);
        setCategoryName(response.data.category);
      }
    } catch (err) {
      if (isClientFetchError(err)) {
        setError(err.errorMessage);
      } else {
        setError("Failed to fetch stream info");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      setSaving(true);
      setError(null);

      const updateData: { title?: string; categoryId?: string } = {};

      if (title !== streamInfo?.title) {
        updateData.title = title;
      }
      if (categoryId && categoryId !== streamInfo?.categoryId) {
        updateData.categoryId = categoryId;
      }

      const response = await apiPost<{
        success: boolean;
        data: TwitchStreamInfo;
        error?: string;
      }>("/api/twitch/update", updateData);

      if (response.success) {
        setStreamInfo(response.data);
        setCategoryName(response.data.category);
        setHasChanges(false);
        toast({
          title: t("control.updateSuccess"),
          description: t("control.updateSuccessDesc"),
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
        title: t("control.updateError"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (streamInfo) {
      setTitle(streamInfo.title);
      setCategoryId(streamInfo.categoryId);
      setCategoryName(streamInfo.category);
      setHasChanges(false);
    }
  };

  return (
    <PanelColorMenu panelId="twitchControl">
      <div
        data-panel-id="twitchControl"
        className="h-full overflow-auto p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-purple-500" />
            <span className="font-semibold">{t("control.title")}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchStreamInfo}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
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
        {!loading && !streamInfo && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("control.noData")}</p>
            <Button variant="outline" onClick={fetchStreamInfo} className="mt-2">
              {tCommon("retry")}
            </Button>
          </div>
        )}

        {/* Edit form */}
        {!loading && streamInfo && (
          <div className="space-y-4">
            {/* Stream Title */}
            <div className="space-y-2">
              <Label htmlFor="stream-title">{t("control.streamTitle")}</Label>
              <Input
                id="stream-title"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder={t("control.titlePlaceholder")}
                maxLength={140}
              />
              <div className="text-xs text-muted-foreground text-right">
                {title.length}/140
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">{t("control.category")}</Label>
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  id="category"
                  value={categoryName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setCategoryName(e.target.value);
                    // Note: For full implementation, this would search Twitch API
                    // and set categoryId from the results
                  }}
                  placeholder={t("control.categoryPlaceholder")}
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("control.categoryHint")}
              </p>
            </div>

            {/* Category ID (for manual entry) */}
            <div className="space-y-2">
              <Label htmlFor="category-id">{t("control.categoryId")}</Label>
              <Input
                id="category-id"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                placeholder={t("control.categoryIdPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("control.categoryIdHint")}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges || saving}
                className="flex-1"
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="flex-1"
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

            {/* Unsaved changes indicator */}
            {hasChanges && (
              <p className="text-xs text-amber-500 text-center">
                {t("control.unsavedChanges")}
              </p>
            )}
          </div>
        )}
      </div>
    </PanelColorMenu>
  );
}
