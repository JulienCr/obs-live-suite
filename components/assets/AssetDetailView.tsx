"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Film, ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TagInput } from "@/components/ui/tag-input";
import { AssetDetailHeader } from "./AssetDetailHeader";
import { AssetVideoPlayer } from "./AssetVideoPlayer";
import { ChapterSection } from "./ChapterSection";
import { ClipSection } from "./ClipSection";
import { apiPatch, apiDelete, apiGet, apiPost } from "@/lib/utils/ClientFetch";
import { formatTimeShort } from "@/lib/utils/durationParser";
import { toast } from "sonner";
import type { DbPoster } from "@/lib/models/Database";
import { useQuery } from "@tanstack/react-query";
import { useVideoKeyboardShortcuts } from "@/lib/hooks";

interface VideoChapter {
  id: string;
  title: string;
  timestamp: number;
}

interface AssetDetailViewProps {
  poster: DbPoster;
  subVideos: DbPoster[];
  parentPoster: DbPoster | null;
  chapters: VideoChapter[];
  locale: string;
}

export function AssetDetailView({
  poster,
  subVideos: initialSubVideos,
  parentPoster,
  chapters: initialChapters,
  locale,
}: AssetDetailViewProps) {
  const t = useTranslations("assets.posters");
  const tCommon = useTranslations("common");
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    title: poster.title,
    description: poster.description || "",
    source: poster.source || "",
    tags: poster.tags,
    chatMessage: poster.chatMessage || "",
    duration: poster.duration || null,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Video keyboard shortcuts state
  const [currentTime, setCurrentTime] = useState(0);
  const [pendingChapterTime, setPendingChapterTime] = useState<number | null>(null);
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const [hoveredClip, setHoveredClip] = useState<DbPoster | null>(null);
  const [hoveredChapter, setHoveredChapter] = useState<VideoChapter | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Fetch tag suggestions
  const { data: tagSuggestions = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await apiGet<{ tags: string[] }>("/api/assets/tags");
      return res.tags;
    },
    staleTime: 60000,
  });

  // Fetch chapters with React Query (shared cache with ChapterSection)
  const { data: chapters = initialChapters } = useQuery({
    queryKey: ["posters", poster.id, "chapters"],
    queryFn: async () => {
      const res = await apiGet<{ chapters: VideoChapter[] }>(`/api/assets/posters/${poster.id}/chapters`);
      return res.chapters;
    },
    initialData: initialChapters,
    staleTime: 30000,
  });

  const handleFieldChange = useCallback(<K extends keyof typeof formData>(
    field: K,
    value: typeof formData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiPatch(`/api/assets/posters/${poster.id}`, formData);
      toast.success(t("posterUpdated"));
      setIsDirty(false);
    } catch (error) {
      toast.error(t("updateFailed"));
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${poster.title}"?`)) return;

    try {
      await apiDelete(`/api/assets/posters/${poster.id}`);
      toast.success(t("posterDeleted"));
      router.push(`/${locale}/assets/posters`);
    } catch (error) {
      toast.error(t("deleteFailed"));
      console.error("Failed to delete:", error);
    }
  };

  const isVideoType = poster.type === "video" || poster.type === "youtube";
  const isClip = !!parentPoster;
  // For clips: use parent duration for timeline, for regular videos: use own duration (from formData for real-time updates)
  const timelineDuration = isClip
    ? (parentPoster.duration || 0)
    : (formData.duration || 0);

  // Check if duration is unknown (null or 0) for YouTube videos
  const hasUnknownDuration = poster.type === "youtube" && timelineDuration === 0;

  // Enable keyboard shortcuts for videos (not clips)
  useVideoKeyboardShortcuts({
    enabled: isVideoType && !isClip,
    currentTime,
    onAddChapter: (time) => setPendingChapterTime(time),
    onSetInPoint: (time) => {
      setInPoint(time);
      toast.info(t("inPointSet", { time: formatTimeShort(time) }));
    },
    onSetOutPoint: (time) => {
      setOutPoint(time);
      toast.info(t("outPointSet", { time: formatTimeShort(time) }));
    },
    onClearInPoint: () => {
      setInPoint(null);
      setOutPoint(null);
      toast.info(t("pointsCleared"));
    },
  });

  // Compute preview range for hover
  const previewRange = hoveredClip
    ? { start: hoveredClip.startTime ?? 0, end: hoveredClip.endTime ?? 0 }
    : undefined;

  // Handle thumbnail regeneration for videos and clips
  const handleRegenerateThumbnail = async () => {
    setIsRegenerating(true);
    try {
      // Use current playhead position
      const timestamp = currentTime;

      // For clips, use parent video. For regular videos, use self.
      const sourceFileUrl = isClip ? parentPoster?.fileUrl : poster.fileUrl;
      if (!sourceFileUrl) throw new Error("No source file");

      // Generate thumbnail
      const data = await apiPost<{ thumbnailUrl: string }>("/api/assets/thumbnail", {
        fileUrl: sourceFileUrl,
        timestamp: timestamp,
      });

      // Update the poster with new thumbnail
      await apiPatch(`/api/assets/posters/${poster.id}`, { thumbnailUrl: data.thumbnailUrl });

      toast.success(t("thumbnailRegenerated"));
      router.refresh();
    } catch {
      toast.error(t("updateFailed"));
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <AssetDetailHeader
        title={formData.title}
        type={poster.type}
        parentPoster={parentPoster ? { id: parentPoster.id, title: parentPoster.title } : null}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Player & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {isVideoType && (
            <>
              {hasUnknownDuration ? (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900 dark:text-amber-100">
                    {t("durationUnknown")}
                  </AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    {t("durationUnknownDescription")}
                  </AlertDescription>
                </Alert>
              ) : (
                <AssetVideoPlayer
                  fileUrl={isClip ? parentPoster.fileUrl : poster.fileUrl}
                  type={poster.type as "video" | "youtube"}
                  duration={timelineDuration}
                  chapters={chapters}
                  startTime={poster.startTime}
                  endTime={poster.endTime}
                  onTimeUpdate={setCurrentTime}
                  previewRange={previewRange}
                  highlightedChapterTime={hoveredChapter?.timestamp}
                  inPointMarker={inPoint}
                  outPointMarker={outPoint}
                />
              )}
            </>
          )}

          {/* Image preview for image type */}
          {poster.type === "image" && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={poster.fileUrl}
                alt={poster.title}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Metadata Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("metadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t("posterTitle")}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  placeholder={t("titlePlaceholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">{t("source")}</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => handleFieldChange("source", e.target.value)}
                    placeholder={t("sourcePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t("description")}</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                  />
                </div>
              </div>

              {/* Duration field for YouTube videos */}
              {poster.type === "youtube" && (
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    {t("durationInSeconds")}
                    {hasUnknownDuration && (
                      <span className="text-amber-600 ml-2 text-xs">
                        {t("durationRequiredForTimeline")}
                      </span>
                    )}
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={formData.duration || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleFieldChange("duration", val ? parseInt(val, 10) : null);
                    }}
                    placeholder={t("durationPlaceholder")}
                    className={hasUnknownDuration ? "border-amber-500" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.duration
                      ? `${formatTimeShort(formData.duration)} (${Math.floor(formData.duration / 60)} minutes)`
                      : t("durationValueUnknown")}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tags">{t("tags")}</Label>
                <TagInput
                  value={formData.tags}
                  onChange={(tags) => handleFieldChange("tags", tags)}
                  suggestions={tagSuggestions}
                  placeholder={t("tagsPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatMessage">{t("chatMessage")}</Label>
                <Textarea
                  id="chatMessage"
                  value={formData.chatMessage}
                  onChange={(e) => handleFieldChange("chatMessage", e.target.value)}
                  placeholder={t("chatMessagePlaceholder")}
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.chatMessage.length}/500
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Chapters & Clips */}
        <div className="space-y-6">
          {isVideoType && !isClip && (
            <>
              <ChapterSection
                posterId={poster.id}
                videoDuration={timelineDuration}
                initialChapters={initialChapters}
                pendingChapterTime={pendingChapterTime}
                onPendingChapterClear={() => setPendingChapterTime(null)}
                onChapterHover={setHoveredChapter}
              />

              <ClipSection
                parentPoster={poster}
                initialClips={initialSubVideos}
                pendingInPoint={inPoint}
                pendingOutPoint={outPoint}
                onPendingPointsClear={() => {
                  setInPoint(null);
                  setOutPoint(null);
                }}
                onClipHover={setHoveredClip}
              />
            </>
          )}

          {/* Thumbnail regeneration for all videos */}
          {poster.type === "video" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("thumbnail")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {poster.thumbnailUrl ? (
                    <img
                      src={poster.thumbnailUrl}
                      className="w-32 aspect-video rounded object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-32 aspect-video bg-muted rounded flex items-center justify-center">
                      <Film className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <Button onClick={handleRegenerateThumbnail} disabled={isRegenerating}>
                    {isRegenerating ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <ImageIcon className="mr-2 h-4 w-4" />
                    )}
                    {t("regenerateThumbnail")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("thumbnailFromPlayhead")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
