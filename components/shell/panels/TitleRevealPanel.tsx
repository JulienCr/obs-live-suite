"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { useTranslations } from "next-intl";
import { Play, EyeOff, Pencil, Trash2, Plus, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { useTitleReveals } from "@/lib/queries/useTitleReveals";
import type { TitleReveal } from "@/lib/queries/useTitleReveals";
import { TitleRevealEditor } from "@/components/title-reveal/TitleRevealEditor";
import { TitleRevealPreview } from "@/components/title-reveal/TitleRevealPreview";
import type { TitleRevealAnimConfig } from "@/lib/titleReveal";
import type { TitleRevealSaveData } from "@/components/title-reveal/TitleRevealEditor";
import type { TitleRevealDefaults } from "@/lib/models/TitleReveal";
import { DEFAULT_TITLE_REVEAL_DEFAULTS } from "@/lib/models/TitleReveal";
import { toast } from "sonner";
import { useMidi } from "@/hooks/useMidi";
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
    uploadSound,
  } = useTitleReveals();

  const { sendCC } = useMidi();
  const midiOutputRef = useRef("");
  const defaultsRef = useRef<TitleRevealDefaults>(DEFAULT_TITLE_REVEAL_DEFAULTS);

  useEffect(() => {
    // Load title reveal defaults
    fetch("/api/settings/title-reveal-defaults")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.settings) {
          defaultsRef.current = data.settings;
        }
      })
      .catch(() => {});
    // Load MIDI output name from word harvest settings (shared)
    fetch("/api/settings/word-harvest-midi")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.settings?.outputName) {
          midiOutputRef.current = data.settings.outputName;
        }
      })
      .catch(() => {});
  }, []);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TitleReveal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [previewConfig, setPreviewConfig] = useState<TitleRevealAnimConfig | null>(null);

  const handleConfigChange = useCallback((config: TitleRevealAnimConfig) => {
    setPreviewConfig(config);
  }, []);

  const handlePlay = (item: TitleReveal) => {
    const defaults = defaultsRef.current;
    // Resolve per-item values with admin defaults as fallback
    const effectiveLogoUrl = item.logoUrl ?? defaults.defaultLogoUrl;
    const effectiveSoundUrl = item.soundUrl ?? defaults.defaultSoundUrl;
    const midiEnabled = item.midiEnabled || defaults.midiEnabled;
    const midiChannel = item.midiEnabled ? item.midiChannel : defaults.midiChannel;
    const midiCc = item.midiEnabled ? item.midiCc : defaults.midiCc;
    const midiValue = item.midiEnabled ? item.midiValue : defaults.midiValue;

    const { id, name, lines, fontFamily, fontSize, rotation, colorText, colorGhostBlue, colorGhostNavy, duration } = item;
    playTitleReveal({ id, name, lines, logoUrl: effectiveLogoUrl, fontFamily, fontSize, rotation, colorText, colorGhostBlue, colorGhostNavy, duration, soundUrl: effectiveSoundUrl });

    // Send MIDI CC if enabled (per-item or default)
    if (midiEnabled) {
      sendCC(midiOutputRef.current, {
        channel: midiChannel,
        cc: midiCc,
        value: midiValue,
      });
    }
  };

  const handleEdit = (item: TitleReveal) => {
    setEditingItem(item);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    setEditorOpen(true);
  };

  const handleDuplicate = async (item: TitleReveal) => {
    try {
      const { id: _, createdAt: _c, updatedAt: _u, sortOrder: _s, ...data } = item;
      await createTitleRevealAsync({ ...data, name: `${data.name} (copy)` });
    } catch (error) {
      console.error("Failed to duplicate title reveal:", error);
      toast.error("Failed to duplicate title reveal");
    }
  };

  const handleDeleteConfirm = (id: string) => {
    deleteTitleReveal(id);
    setDeleteTarget(null);
  };

  const handleSave = async (data: TitleRevealSaveData) => {
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
                    onClick={() => handleDuplicate(item)}
                    title={t("duplicate")}
                  >
                    <Copy className="h-3.5 w-3.5" />
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
        <DialogContent className="!flex !flex-col !gap-0 max-w-6xl h-[85vh] overflow-hidden p-0">
          <div className="flex flex-1 min-h-0">
            {/* Left: sticky preview */}
            <div className="hidden md:flex w-1/2 flex-col bg-black/5 dark:bg-black/20 border-r px-0 py-6">
              <DialogHeader className="mb-4 shrink-0 px-6">
                <DialogTitle>{t("preview")}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 flex items-center w-full">
                {previewConfig && (
                  <div className="w-full">
                    <TitleRevealPreview config={previewConfig} />
                  </div>
                )}
              </div>
            </div>
            {/* Right: scrollable editor */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <DialogHeader className="mb-4">
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
                uploadSound={uploadSound}
                onConfigChange={handleConfigChange}
              />
            </div>
          </div>
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
