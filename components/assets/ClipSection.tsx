"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Plus, Film, Clock, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SubVideoEditor } from "./SubVideoEditor";
import { formatTime } from "./VideoTimeline";
import { apiGet } from "@/lib/utils/ClientFetch";
import type { DbPoster } from "@/lib/models/Database";

interface ClipSectionProps {
  parentPoster: DbPoster;
  initialClips?: DbPoster[];
  onClipCreated?: () => void;
  pendingInPoint?: number | null;   // In point from I key shortcut
  pendingOutPoint?: number | null;  // Out point from O key shortcut
  onPendingPointsClear?: () => void; // Clear pending points after dialog closes
  onClipHover?: (clip: DbPoster | null) => void; // For timeline preview on hover
}

export function ClipSection({
  parentPoster,
  initialClips = [],
  onClipCreated,
  pendingInPoint,
  pendingOutPoint,
  onPendingPointsClear,
  onClipHover,
}: ClipSectionProps) {
  const t = useTranslations("assets.posters");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Auto-open dialog when both pending points are set (I/O keyboard shortcuts)
  useEffect(() => {
    if (pendingInPoint != null && pendingOutPoint != null) {
      setIsCreateOpen(true);
    }
  }, [pendingInPoint, pendingOutPoint]);

  // Handle dialog close - clear pending points
  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      onPendingPointsClear?.();
    }
  };

  const { data: clips = initialClips, refetch } = useQuery({
    queryKey: ["posters", parentPoster.id, "subvideos"],
    queryFn: async () => {
      const res = await apiGet<{ subVideos: DbPoster[] }>(`/api/assets/posters/${parentPoster.id}/subvideos`);
      return res.subVideos;
    },
    initialData: initialClips,
    staleTime: 30000,
  });

  const handleClipCreated = () => {
    refetch();
    setIsCreateOpen(false);
    onClipCreated?.();
  };

  // Don't show for clips (sub-videos can't have sub-videos)
  if (parentPoster.parentPosterId) {
    return null;
  }

  // Only show for video/youtube types
  if (parentPoster.type !== "video" && parentPoster.type !== "youtube") {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{t("clips")}</CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t("createClip")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t("createClip")}</DialogTitle>
            </DialogHeader>
            <SubVideoEditor
              parentPoster={parentPoster}
              onSubVideoCreated={handleClipCreated}
              onClose={() => handleDialogOpenChange(false)}
              initialStartTime={pendingInPoint ?? undefined}
              initialEndTime={pendingOutPoint ?? undefined}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {clips.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noClips")}
          </p>
        ) : (
          <ScrollArea className="h-[250px]">
            <div className="grid gap-3">
              {clips.map((clip) => (
                <Link
                  key={clip.id}
                  href={`/assets/posters/${clip.id}`}
                  className="block"
                  onMouseEnter={() => onClipHover?.(clip)}
                  onMouseLeave={() => onClipHover?.(null)}
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                    {/* Thumbnail */}
                    <div className="w-24 h-14 rounded overflow-hidden bg-muted flex-shrink-0 relative">
                      {clip.thumbnailUrl ? (
                        <img
                          src={clip.thumbnailUrl}
                          alt={clip.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{clip.title}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime(clip.startTime ?? 0)} - {formatTime(clip.endTime ?? 0)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {formatTime((clip.endTime ?? 0) - (clip.startTime ?? 0))}
                        </Badge>
                        {clip.endBehavior === "loop" && (
                          <Badge variant="secondary" className="text-xs">Loop</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
