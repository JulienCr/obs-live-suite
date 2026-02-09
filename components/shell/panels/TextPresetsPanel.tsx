import { type IDockviewPanelProps } from "dockview-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Zap, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiPost, apiGet } from "@/lib/utils/ClientFetch";
import { DASHBOARD_EVENTS } from "@/lib/config/Constants";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { useTextPresets } from "@/lib/queries";
import { useDockview } from "../DockviewContext";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import type { LowerThirdEvent } from "@/lib/models/OverlayEvents";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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

const config: PanelConfig = { id: "textPresets", context: "dashboard" };

/**
 * Text Presets panel for Dockview - quick play text lower thirds
 */
export function TextPresetsPanel(_props: IDockviewPanelProps) {
  const t = useTranslations("dashboard.textPresets");
  const tCommon = useTranslations("common");
  const { api: dockviewApi } = useDockview();
  const { textPresets: allPresets, isLoading: loading, deleteTextPreset } = useTextPresets({ enabled: true });
  const MAX_VISIBLE_PRESETS = 10;
  const textPresets = allPresets.slice(0, MAX_VISIBLE_PRESETS);
  const hiddenCount = allPresets.length - textPresets.length;

  const [activeTextPresetId, setActiveTextPresetId] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Handle lower third events to track active text preset
  const handleLowerThirdEvent = useCallback((data: LowerThirdEvent) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (data.type === "show" && data.payload?.contentType === "text") {
      setActiveTextPresetId(data.payload.textPresetId || null);

      if (data.payload.duration) {
        hideTimeoutRef.current = setTimeout(() => {
          setActiveTextPresetId(null);
          hideTimeoutRef.current = null;
        }, data.payload.duration * 1000);
      }
    } else if (data.type === "hide") {
      setActiveTextPresetId(null);
    }
  }, []);

  useWebSocketChannel<LowerThirdEvent>("lower", handleLowerThirdEvent, {
    logPrefix: "TextPresetsPanel",
  });

  // Clean up hide timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleQuickShow = async (preset: typeof textPresets[0]) => {
    try {
      if (activeTextPresetId === preset.id) {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        await apiPost("/api/actions/lower/hide");
        setActiveTextPresetId(null);
        return;
      }

      await apiPost(`/api/actions/lower/text-preset/${preset.id}`, {});
    } catch (error) {
      console.error("Failed to show/hide text preset lower third:", error);
    }
  };

  const handleEdit = (preset: typeof textPresets[0]) => {
    window.dispatchEvent(
      new CustomEvent(DASHBOARD_EVENTS.LOAD_TEXT_PRESET, {
        detail: {
          body: preset.body,
          side: preset.side,
          imageUrl: preset.imageUrl,
          imageAlt: preset.imageAlt,
        },
      })
    );

    // Switch to LowerThird panel
    if (dockviewApi) {
      const ltPanel = dockviewApi.getPanel("lowerThird");
      if (ltPanel) {
        ltPanel.api.setActive();
      }
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteTextPreset(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <BasePanelWrapper config={config}>
      {loading ? (
        <div className="text-sm text-muted-foreground">{tCommon("loading")}</div>
      ) : textPresets.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          {t("noPresets")}
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-2"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "hsl(var(--muted)) transparent",
          }}
        >
          {textPresets.map((preset, index) => {
            const isActive = activeTextPresetId === preset.id;
            return (
              <ContextMenu key={preset.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className={cn(
                      "relative flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer group border-2",
                      isActive
                        ? "bg-muted/50 border-green-500"
                        : "border-transparent hover:bg-muted/50"
                    )}
                    onClick={() => handleQuickShow(preset)}
                    title={t("showTooltip", {
                      name: preset.name,
                      shortcut: index === 9 ? "0" : String(index + 1),
                    })}
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                      {index === 9 ? "0" : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {preset.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {preset.body.substring(0, 40)}
                      </div>
                    </div>

                    {isActive ? (
                      <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
                        <Zap className="w-3 h-3 text-white fill-white" />
                      </div>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-6 w-6 flex items-center justify-center">
                        <Zap className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => handleEdit(preset)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    {t("editPreset")}
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget({ id: preset.id, name: preset.name })}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("deletePreset")}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="text-xs text-muted-foreground text-center py-1">
          {t("morePresets", { count: hiddenCount })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget && t("confirmDelete", { name: deleteTarget.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t("deletePreset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BasePanelWrapper>
  );
}
