"use client";

import { useState, useMemo, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Film, Clock, RefreshCw, ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { apiPost } from "@/lib/utils/ClientFetch";
import type { DbPoster } from "@/lib/models/Database";
import type { EndBehavior } from "@/lib/models/Poster";
import { VideoTimeline, formatTime } from "./VideoTimeline";

export interface SubVideoEditorProps {
  parentPoster: DbPoster;
  onSubVideoCreated?: (subVideo: DbPoster) => void;
  onClose?: () => void;
  initialStartTime?: number;  // Pre-fill start time (e.g., from I key shortcut)
  initialEndTime?: number;    // Pre-fill end time (e.g., from O key shortcut)
}

interface CreateSubVideoResponse {
  subVideo: DbPoster;
  message: string;
}

interface GenerateThumbnailResponse {
  thumbnailUrl: string;
  source: "local" | "youtube";
  timestamp: number;
  message: string;
}

/**
 * SubVideoEditor - Component for creating sub-video clips from a parent video
 */
export function SubVideoEditor({
  parentPoster,
  onSubVideoCreated,
  onClose,
  initialStartTime,
  initialEndTime,
}: SubVideoEditorProps) {
  const t = useTranslations("assets.videoEditor");
  const tCommon = useTranslations("common");

  // Default duration when not known (1 hour as reasonable default for clips)
  const DEFAULT_DURATION = 3600;
  const effectiveDuration = parentPoster.duration || DEFAULT_DURATION;

  // Compute initial values (use props if provided, otherwise defaults)
  const defaultStart = initialStartTime ?? 0;
  const defaultEnd = initialEndTime ?? Math.min(60, effectiveDuration);

  // Form state
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [endBehavior, setEndBehavior] = useState<EndBehavior>("stop");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number }>({
    start: defaultStart,
    end: defaultEnd,
  });

  // Sync selection range with form state
  const handleSelectionChange = useCallback((range: { start: number; end: number }) => {
    setSelectionRange(range);
    setStartTime(Math.floor(range.start));
    setEndTime(Math.floor(range.end));
  }, []);

  // Calculated clip duration
  const clipDuration = useMemo(() => endTime - startTime, [startTime, endTime]);

  // Create sub-video mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiPost<CreateSubVideoResponse>(
        `/api/assets/posters/${parentPoster.id}/subvideos`,
        {
          title: title.trim(),
          startTime,
          endTime,
          endBehavior,
          thumbnailUrl,
        }
      );
      return response.subVideo;
    },
    onSuccess: (subVideo) => {
      toast.success(t("subVideoCreated"));
      onSubVideoCreated?.(subVideo);
      onClose?.();
    },
    onError: (error) => {
      console.error("Failed to create sub-video:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create sub-video");
    },
  });

  // Generate thumbnail mutation
  const thumbnailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiPost<GenerateThumbnailResponse>(
        "/api/assets/thumbnail",
        {
          fileUrl: parentPoster.fileUrl,
          timestamp: startTime, // First frame of the clip
        }
      );
      return response;
    },
    onSuccess: (response) => {
      setThumbnailUrl(response.thumbnailUrl);
      toast.success(t("thumbnailGenerated"));
    },
    onError: (error) => {
      console.error("Failed to generate thumbnail:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate thumbnail");
    },
  });

  // Validation
  const isValid = useMemo(() => {
    if (!title.trim()) return false;
    if (startTime < 0) return false;
    if (endTime <= startTime) return false;
    if (endTime > effectiveDuration) return false;
    return true;
  }, [title, startTime, endTime, effectiveDuration]);

  const handleCreate = () => {
    if (!isValid) return;
    createMutation.mutate();
  };

  const isSubmitting = createMutation.isPending;
  const isGeneratingThumbnail = thumbnailMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Parent video info */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Film className="h-5 w-5 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{parentPoster.title}</p>
          <p className="text-xs text-muted-foreground">
            {parentPoster.duration
              ? `${formatTime(parentPoster.duration)} • ${parentPoster.type}`
              : parentPoster.type}
          </p>
        </div>
      </div>

      {/* Title input */}
      <div className="space-y-2">
        <Label htmlFor="subvideo-title">{tCommon("title")}</Label>
        <Input
          id="subvideo-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${parentPoster.title} - Clip`}
          maxLength={200}
          disabled={isSubmitting}
        />
      </div>

      {/* Timeline for visual selection */}
      <div className="space-y-2">
        <Label>{t("selectRange")}</Label>
        <VideoTimeline
          duration={effectiveDuration}
          selectionRange={selectionRange}
          onSelectionChange={handleSelectionChange}
          readOnly={isSubmitting}
          className="pt-2"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t("startTime")}: <strong className="text-foreground font-mono">{formatTime(startTime)}</strong>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {t("clipDuration")}: <strong className="text-foreground">{formatTime(clipDuration)}</strong>
          </span>
          <span>
            {t("endTime")}: <strong className="text-foreground font-mono">{formatTime(endTime)}</strong>
          </span>
        </div>
      </div>

      {/* End behavior select */}
      <div className="space-y-2">
        <Label htmlFor="end-behavior">{t("endBehavior")}</Label>
        <Select
          value={endBehavior}
          onValueChange={(value) => setEndBehavior(value as EndBehavior)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="end-behavior">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stop">
              <div className="flex items-center gap-2">
                <span>{t("stop")}</span>
                <span className="text-xs text-muted-foreground">- {t("stopDescription")}</span>
              </div>
            </SelectItem>
            <SelectItem value="loop">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3 w-3" />
                <span>{t("loop")}</span>
                <span className="text-xs text-muted-foreground">- {t("loopDescription")}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Thumbnail section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t("thumbnail")}</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => thumbnailMutation.mutate()}
            disabled={isGeneratingThumbnail || isSubmitting}
          >
            {isGeneratingThumbnail ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4 mr-2" />
            )}
            {t("generateThumbnail")}
          </Button>
        </div>
        {thumbnailUrl ? (
          <div className="relative aspect-video w-full max-w-xs rounded-lg overflow-hidden border bg-muted">
            <img
              src={thumbnailUrl}
              alt="Thumbnail preview"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video w-full max-w-xs rounded-lg border border-dashed flex items-center justify-center bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {t("noThumbnail")}
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          {tCommon("cancel")}
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("createSubVideo")}
        </Button>
      </div>
    </div>
  );
}
