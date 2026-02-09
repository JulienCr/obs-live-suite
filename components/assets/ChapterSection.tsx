"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { formatTimeShort as formatTime } from "@/lib/utils/durationParser";
import { VideoTimeline } from "./VideoTimeline";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/utils/ClientFetch";
import { toast } from "sonner";

interface VideoChapter {
  id: string;
  title: string;
  timestamp: number;
}

interface ChapterSectionProps {
  posterId: string;
  videoDuration: number;
  initialChapters?: VideoChapter[];
  onChaptersChange?: (chapters: VideoChapter[]) => void;
  pendingChapterTime?: number | null;
  onPendingChapterClear?: () => void;
  onChapterHover?: (chapter: VideoChapter | null) => void;
}

export function ChapterSection({
  posterId,
  videoDuration,
  initialChapters = [],
  onChaptersChange,
  pendingChapterTime,
  onPendingChapterClear,
  onChapterHover,
}: ChapterSectionProps) {
  const t = useTranslations("assets.chapterEditor");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<VideoChapter | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<VideoChapter | null>(null);
  const [title, setTitle] = useState("");
  const [timestamp, setTimestamp] = useState(0);

  // Auto-open dialog when pendingChapterTime is set (from keyboard shortcut)
  useEffect(() => {
    if (pendingChapterTime != null) {
      setTitle("");
      setTimestamp(pendingChapterTime);
      setIsAddOpen(true);
    }
  }, [pendingChapterTime]);

  const { data: chapters = initialChapters } = useQuery({
    queryKey: ["posters", posterId, "chapters"],
    queryFn: async () => {
      const res = await apiGet<{ chapters: VideoChapter[] }>(`/api/assets/posters/${posterId}/chapters`);
      return res.chapters;
    },
    initialData: initialChapters,
    staleTime: 30000,
  });

  const invalidateChapters = () => {
    queryClient.invalidateQueries({ queryKey: ["posters", posterId, "chapters"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; timestamp: number }) => {
      return apiPost<{ chapter: VideoChapter }>(`/api/assets/posters/${posterId}/chapters`, data);
    },
    onSuccess: () => {
      toast.success(t("toasts.chapterCreated"));
      invalidateChapters();
      resetForm();
      setIsAddOpen(false);
    },
    onError: () => {
      toast.error(t("toasts.createFailed"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; timestamp?: number }) => {
      return apiPatch<{ chapter: VideoChapter }>(`/api/assets/posters/${posterId}/chapters/${id}`, data);
    },
    onSuccess: () => {
      toast.success(t("toasts.chapterUpdated"));
      invalidateChapters();
      resetForm();
      setEditingChapter(null);
    },
    onError: () => {
      toast.error(t("toasts.updateFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiDelete(`/api/assets/posters/${posterId}/chapters/${id}`);
    },
    onSuccess: () => {
      toast.success(t("toasts.chapterDeleted"));
      invalidateChapters();
      setChapterToDelete(null);
    },
    onError: () => {
      toast.error(t("toasts.deleteFailed"));
    },
  });

  const resetForm = () => {
    setTitle("");
    setTimestamp(0);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (chapter: VideoChapter) => {
    setTitle(chapter.title);
    setTimestamp(chapter.timestamp);
    setEditingChapter(chapter);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error(t("toasts.titleRequired"));
      return;
    }
    if (timestamp < 0 || timestamp > videoDuration) {
      toast.error(t("toasts.invalidTimestamp"));
      return;
    }

    if (editingChapter) {
      updateMutation.mutate({ id: editingChapter.id, title: title.trim(), timestamp });
    } else {
      createMutation.mutate({ title: title.trim(), timestamp });
    }
  };

  const sortedChapters = [...chapters].sort((a, b) => a.timestamp - b.timestamp);

  const ChapterForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="chapter-title">{t("chapterTitle")}</Label>
        <Input
          id="chapter-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={100}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label>{t("timestamp")}</Label>
        <VideoTimeline
          duration={videoDuration}
          chapters={sortedChapters.filter(c => c.id !== editingChapter?.id)}
          currentTime={timestamp}
          onSeek={setTimestamp}
          className="h-16"
        />
        <div className="text-sm text-muted-foreground text-center">
          {formatTime(timestamp)} / {formatTime(videoDuration)}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => {
          setIsAddOpen(false);
          setEditingChapter(null);
          resetForm();
        }}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
          {editingChapter ? tCommon("save") : t("addChapter")}
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{t("title")}</CardTitle>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            onPendingChapterClear?.();
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-1" />
              {t("addChapter")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addChapter")}</DialogTitle>
              <DialogDescription>{t("addChapterDescription")}</DialogDescription>
            </DialogHeader>
            <ChapterForm />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sortedChapters.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noChapters")}
          </p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {sortedChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                  onMouseEnter={() => onChapterHover?.(chapter)}
                  onMouseLeave={() => onChapterHover?.(null)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatTime(chapter.timestamp)}
                    </span>
                    <span className="text-sm truncate">{chapter.title}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Dialog open={editingChapter?.id === chapter.id} onOpenChange={(open) => !open && setEditingChapter(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(chapter)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("editChapter")}</DialogTitle>
                          <DialogDescription>{t("editChapterDescription")}</DialogDescription>
                        </DialogHeader>
                        <ChapterForm />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setChapterToDelete(chapter)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <AlertDialog open={!!chapterToDelete} onOpenChange={(open) => !open && setChapterToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteConfirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => chapterToDelete && deleteMutation.mutate(chapterToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
