"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Palette } from "lucide-react";
import { Theme, CreateThemeInput } from "@/lib/models/Theme";
import { ThemeList } from "./ThemeList";
import { ThemeEditor } from "./ThemeEditor";
import { useThemeEditorStore, DEFAULT_FORM_DATA } from "@/lib/stores";
import { apiPost } from "@/lib/utils/ClientFetch";
import { useThemes, useProfiles } from "@/lib/queries";

/**
 * Refactored theme management component (orchestrator)
 */
export function ThemeManager() {
  const {
    themes,
    isLoading: loading,
    createThemeAsync,
    updateThemeAsync,
    deleteThemeAsync,
  } = useThemes();

  const { activeProfile, updateProfileAsync } = useProfiles();

  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateThemeInput>>(DEFAULT_FORM_DATA);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTheme(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  const handleEdit = (theme: Theme) => {
    setIsCreating(false);
    setEditingTheme(theme);
    setFormData({
      name: theme.name,
      colors: theme.colors,
      lowerThirdTemplate: theme.lowerThirdTemplate,
      lowerThirdFont: theme.lowerThirdFont,
      lowerThirdLayout: theme.lowerThirdLayout || { x: 60, y: 920, scale: 1 },
      lowerThirdAnimation: theme.lowerThirdAnimation || DEFAULT_FORM_DATA.lowerThirdAnimation,
      countdownStyle: theme.countdownStyle,
      countdownFont: theme.countdownFont,
      countdownLayout: theme.countdownLayout || { x: 960, y: 540, scale: 1 },
      posterLayout: theme.posterLayout || { x: 960, y: 540, scale: 1 },
      isGlobal: theme.isGlobal,
    });
  };

  const handleSave = async (data: Partial<CreateThemeInput>) => {
    try {
      setError(null);

      if (isCreating) {
        await createThemeAsync(data);
      } else if (editingTheme) {
        await updateThemeAsync({ id: editingTheme.id, ...data });
      }

      setIsCreating(false);
      setEditingTheme(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save theme");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTheme(null);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this theme?")) {
      return;
    }

    try {
      setError(null);
      await deleteThemeAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete theme");
    }
  };

  const handleApplyTheme = async (themeId: string) => {
    try {
      setError(null);

      if (!activeProfile) {
        throw new Error("No active profile found");
      }

      await updateProfileAsync({ id: activeProfile.id, themeId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to apply theme";
      setError(message);
      alert(message);
    }
  };

  const testLowerThird = async () => {
    try {
      await apiPost("/api/overlays/lower", {
        action: "show",
        payload: {
          title: "Theme Preview",
          subtitle: "Testing new theme",
          side: "left",
          duration: 5,
        },
      });
    } catch (err) {
      console.error("Failed to test lower third:", err);
    }
  };

  const testCountdown = async () => {
    try {
      await apiPost("/api/overlays/countdown", {
        action: "set",
        payload: { seconds: 300 },
      });

      await apiPost("/api/overlays/countdown", { action: "start" });
    } catch (err) {
      console.error("Failed to test countdown:", err);
    }
  };

  const sendLivePreviewToOBS = async (data: Partial<CreateThemeInput>) => {
    if (!data.colors || !data.lowerThirdFont || !data.lowerThirdLayout) {
      return;
    }

    try {
      await apiPost("/api/overlays/lower", {
        action: "show",
        payload: {
          title: "Live Preview",
          subtitle: data.name || "Theme Editor",
          side: "left",
          duration: 999999,
          theme: {
            colors: data.colors,
            template: data.lowerThirdTemplate,
            font: data.lowerThirdFont,
            layout: data.lowerThirdLayout,
          },
        },
      });
    } catch (err) {
      console.error("Failed to send live preview:", err);
    }
  };

  const hideLivePreview = async () => {
    try {
      await apiPost("/api/overlays/lower", { action: "hide", payload: {} });
    } catch (err) {
      console.error("Failed to hide live preview:", err);
    }
  };

  // Show/hide OBS preview when entering/exiting edit mode
  useEffect(() => {
    const isEditing = isCreating || editingTheme !== null;
    if (isEditing) {
      sendLivePreviewToOBS(formData);
    } else {
      hideLivePreview();
    }

    return () => {
      if (isEditing) {
        hideLivePreview();
      }
    };
  }, [isCreating, editingTheme]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 animate-spin" />
          <span>Loading themes...</span>
        </div>
      </div>
    );
  }

  const isEditing = isCreating || editingTheme !== null;

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isEditing ? (
        <ThemeEditorInitializer
          initialData={formData}
          onOBSPreviewUpdate={sendLivePreviewToOBS}
        >
          <ThemeEditor
            isCreating={isCreating}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </ThemeEditorInitializer>
      ) : (
        <ThemeList
          themes={themes}
          activeThemeId={activeProfile?.themeId ?? null}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onApply={handleApplyTheme}
          onTestLowerThird={testLowerThird}
          onTestCountdown={testCountdown}
        />
      )}
    </div>
  );
}

/**
 * Helper component that initializes/cleans up the theme editor store
 * when entering/leaving edit mode (replaces ThemeEditorProvider).
 */
function ThemeEditorInitializer({
  initialData,
  onOBSPreviewUpdate,
  children,
}: {
  initialData?: Partial<CreateThemeInput>;
  onOBSPreviewUpdate?: (formData: Partial<CreateThemeInput>) => void;
  children: React.ReactNode;
}) {
  const init = useThemeEditorStore((s) => s.init);
  const cleanup = useThemeEditorStore((s) => s.cleanup);

  useEffect(() => {
    init(initialData, onOBSPreviewUpdate);
    return () => {
      cleanup();
    };
  }, []); // Only on mount/unmount

  return <>{children}</>;
}
