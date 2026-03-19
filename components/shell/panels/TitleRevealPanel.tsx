"use client";

import { useState } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { useTranslations } from "next-intl";
import { Play, EyeOff, Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { useTitleReveals } from "@/lib/queries/useTitleReveals";
import type { TitleReveal } from "@/lib/queries/useTitleReveals";
import { TitleRevealEditor } from "@/components/title-reveal/TitleRevealEditor";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const config: PanelConfig = { id: "titleReveal", context: "dashboard" };

export function TitleRevealPanel(_props: IDockviewPanelProps) {
  const t = useTranslations("dashboard.titleReveal");
  const {
    titleReveals,
    isLoading,
    deleteTitleReveal,
    playTitleReveal,
    hideTitleReveal,
    isPlaying,
    isHiding,
    isDeleting,
    createTitleRevealAsync,
    updateTitleRevealAsync,
    uploadLogo,
  } = useTitleReveals();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TitleReveal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handlePlay = (item: TitleReveal) => {
    const { id, name, lines, logoUrl, fontFamily, fontSize, rotation, colorText, colorGhostBlue, colorGhostNavy, duration } = item;
    playTitleReveal({ id, name, lines, logoUrl, fontFamily, fontSize, rotation, colorText, colorGhostBlue, colorGhostNavy, duration });
  };

  const handleEdit = (item: TitleReveal) => {
    setEditingItem(item);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    setEditorOpen(true);
  };

  const handleDeleteConfirm = (id: string) => {
    deleteTitleReveal(id);
    setDeleteTarget(null);
  };

  const handleSave = async (data: {
    name: string;
    lines: TitleReveal["lines"];
    logoUrl: string | null;
    fontFamily: string;
    fontSize: number;
    rotation: number;
    colorText: string;
    colorGhostBlue: string;
    colorGhostNavy: string;
    duration: number;
  }) => {
    try {
      if (editingItem) {
        await updateTitleRevealAsync({ id: editingItem.id, ...data });
      } else {
        await createTitleRevealAsync(data);
      }
      setEditorOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Failed to save title reveal:", error);
      toast.error("Failed to save title reveal");
    }
  };

  return (
    <BasePanelWrapper config={config}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="default" size="sm" onClick={handleNew}>
            <Plus className="h-4 w-4 mr-1" />
            {t("newTitle")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => hideTitleReveal()}
            disabled={isHiding}
          >
            <EyeOff className="h-4 w-4 mr-1" />
            {t("hide")}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : titleReveals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("noTitles")}
          </p>
        ) : (
          <div className="space-y-2">
            {titleReveals.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-md border border-input bg-background p-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.lines.map((l) => l.text).join(" / ")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handlePlay(item)}
                    disabled={isPlaying}
                    title={t("play")}
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEdit(item)}
                    title={t("edit")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                    disabled={isDeleting}
                    title={t("delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t("editTitle") : t("newTitle")}
            </DialogTitle>
          </DialogHeader>
          <TitleRevealEditor
            initial={editingItem}
            onSave={handleSave}
            onCancel={() => {
              setEditorOpen(false);
              setEditingItem(null);
            }}
            uploadLogo={uploadLogo}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        target={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        title={deleteTarget ? t("confirmDelete", { name: deleteTarget.name }) : ""}
        description={t("confirmDeleteDesc")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
      />
    </BasePanelWrapper>
  );
}
