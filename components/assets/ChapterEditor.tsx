"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/utils/ClientFetch";
import { formatTimeShort } from "@/lib/utils/durationParser";
import type { VideoChapter } from "@/lib/models/Poster";
import { VideoTimeline } from "./VideoTimeline";

interface ChapterEditorProps {
  posterId: string;
  videoDuration: number; // in seconds
  onChaptersChange?: (chapters: VideoChapter[]) => void;
}

interface ChaptersResponse {
  chapters: VideoChapter[];
}

interface ChapterResponse {
  chapter: VideoChapter;
}

interface DeleteResponse {
  success: boolean;
}

/**
 * ChapterEditor - Component for managing video chapters
 *
 * Provides CRUD operations for chapters associated with a poster/video.
 * Chapters are displayed sorted by timestamp.
 */
export function ChapterEditor({
  posterId,
  videoDuration,
  onChaptersChange,
}: ChapterEditorProps) {
  const t = useTranslations("assets.chapterEditor");
  const queryClient = useQueryClient();

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<VideoChapter | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<VideoChapter | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [timestamp, setTimestamp] = useState<number>(0);

  // Query key for chapters
  const chaptersQueryKey = ["posters", posterId, "chapters"];

  // Fetch chapters
  const { data: chapters = [], isLoading } = useQuery({
    queryKey: chaptersQueryKey,
    queryFn: async () => {
      const response = await apiGet<ChaptersResponse>(
        `/api/assets/posters/${posterId}/chapters`
      );
      return response.chapters;
    },
    staleTime: 30 * 1000,
  });

  // Sorted chapters by timestamp
  const sortedChapters = [...chapters].sort((a, b) => a.timestamp - b.timestamp);

  // Invalidate and notify parent
  const invalidateChapters = () => {
    queryClient.invalidateQueries({ queryKey: chaptersQueryKey });
  };

  const notifyChaptersChange = (newChapters: VideoChapter[]) => {
    if (onChaptersChange) {
      onChaptersChange(newChapters);
    }
  };

  // Create chapter mutation
  const createMutation = useMutation({
    mutationFn: async (data: { title: string; timestamp: number }) => {
      const response = await apiPost<ChapterResponse>(
        `/api/assets/posters/${posterId}/chapters`,
        data
      );
      return response.chapter;
    },
    onSuccess: (newChapter) => {
      invalidateChapters();
      const updatedChapters = [...chapters, newChapter].sort(
        (a, b) => a.timestamp - b.timestamp
      );
      notifyChaptersChange(updatedChapters);
      toast.success(t("toasts.chapterCreated"));
      closeDialog();
    },
    onError: (error) => {
      console.error("Failed to create chapter:", error);
      toast.error(t("toasts.createFailed"));
    },
  });

  // Update chapter mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      chapterId,
      data,
    }: {
      chapterId: string;
      data: { title?: string; timestamp?: number };
    }) => {
      const response = await apiPatch<ChapterResponse>(
        `/api/assets/posters/${posterId}/chapters/${chapterId}`,
        data
      );
      return response.chapter;
    },
    onSuccess: (updatedChapter) => {
      invalidateChapters();
      const updatedChapters = chapters
        .map((c) => (c.id === updatedChapter.id ? updatedChapter : c))
        .sort((a, b) => a.timestamp - b.timestamp);
      notifyChaptersChange(updatedChapters);
      toast.success(t("toasts.chapterUpdated"));
      closeDialog();
    },
    onError: (error) => {
      console.error("Failed to update chapter:", error);
      toast.error(t("toasts.updateFailed"));
    },
  });

  // Delete chapter mutation
  const deleteMutation = useMutation({
    mutationFn: async (chapterId: string) => {
      await apiDelete<DeleteResponse>(
        `/api/assets/posters/${posterId}/chapters/${chapterId}`
      );
      return chapterId;
    },
    onSuccess: (deletedId) => {
      invalidateChapters();
      const updatedChapters = chapters.filter((c) => c.id !== deletedId);
      notifyChaptersChange(updatedChapters);
      toast.success(t("toasts.chapterDeleted"));
      setChapterToDelete(null);
    },
    onError: (error) => {
      console.error("Failed to delete chapter:", error);
      toast.error(t("toasts.deleteFailed"));
    },
  });

  // Open dialog for adding new chapter
  const openAddDialog = () => {
    setEditingChapter(null);
    setTitle("");
    setTimestamp(0);
    setIsDialogOpen(true);
  };

  // Open dialog for editing existing chapter
  const openEditDialog = (chapter: VideoChapter) => {
    setEditingChapter(chapter);
    setTitle(chapter.title);
    setTimestamp(chapter.timestamp);
    setIsDialogOpen(true);
  };

  // Close dialog and reset state
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingChapter(null);
    setTitle("");
    setTimestamp(0);
  };

  // Handle form submission
  const handleSave = () => {
    if (!title.trim()) {
      toast.error(t("toasts.titleRequired"));
      return;
    }

    if (timestamp < 0 || timestamp > videoDuration) {
      toast.error(t("toasts.invalidTimestamp"));
      return;
    }

    if (editingChapter) {
      updateMutation.mutate({
        chapterId: editingChapter.id,
        data: { title: title.trim(), timestamp },
      });
    } else {
      createMutation.mutate({ title: title.trim(), timestamp });
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (chapterToDelete) {
      deleteMutation.mutate(chapterToDelete.id);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        <Button size="sm" variant="outline" onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-1" />
          {t("addChapter")}
        </Button>
      </div>

      {/* Chapters list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sortedChapters.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {t("noChapters")}
        </div>
      ) : (
        <ScrollArea className="max-h-64 border rounded-md">
          <div className="divide-y">
            {sortedChapters.map((chapter) => (
              <div
                key={chapter.id}
                className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-mono">
                      {formatTimeShort(chapter.timestamp)}
                    </span>
                  </div>
                  <span className="text-sm truncate" title={chapter.title}>
                    {chapter.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => openEditDialog(chapter)}
                    title={t("edit")}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => setChapterToDelete(chapter)}
                    title={t("delete")}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChapter ? t("editChapter") : t("addChapter")}
            </DialogTitle>
            <DialogDescription>
              {editingChapter ? t("editChapterDescription") : t("addChapterDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chapter-title">{t("chapterTitle")}</Label>
              <Input
                id="chapter-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                maxLength={100}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("timestamp")}</Label>
              <VideoTimeline
                duration={videoDuration}
                currentTime={timestamp}
                onSeek={(time) => setTimestamp(Math.floor(time))}
                chapters={sortedChapters.filter((c) => c.id !== editingChapter?.id)}
                readOnly={isSubmitting}
                className="h-14"
              />
              <div className="text-sm text-muted-foreground text-center">
                {formatTimeShort(timestamp)} / {formatTimeShort(videoDuration)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!chapterToDelete}
        onOpenChange={(open) => !open && setChapterToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm.description", { title: chapterToDelete?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("deleteConfirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("deleteConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
