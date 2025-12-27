"use client";

import { useState, useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Palette } from "lucide-react";
import { Theme, CreateThemeInput, LowerThirdTemplate, CountdownStyle } from "@/lib/models/Theme";
import { ThemeList } from "./ThemeList";
import { ThemeEditor } from "./ThemeEditor";
import { ThemeEditorProvider } from "./ThemeEditorContext";

const DEFAULT_THEME_DATA: Partial<CreateThemeInput> = {
  name: "",
  colors: {
    primary: "#3B82F6",
    accent: "#60A5FA",
    surface: "#1E293B",
    text: "#F8FAFC",
    success: "#10B981",
    warn: "#F59E0B",
  },
  lowerThirdTemplate: LowerThirdTemplate.CLASSIC,
  lowerThirdFont: {
    family: "Inter, sans-serif",
    size: 28,
    weight: 700,
  },
  lowerThirdLayout: { x: 60, y: 920, scale: 1 },
  lowerThirdAnimation: {
    timing: {
      logoFadeDuration: 200,
      logoScaleDuration: 200,
      flipDuration: 600,
      flipDelay: 500,
      barAppearDelay: 800,
      barExpandDuration: 450,
      textAppearDelay: 1000,
      textFadeDuration: 250,
    },
    styles: {
      barBorderRadius: 16,
      barMinWidth: 200,
      avatarBorderWidth: 4,
      avatarBorderColor: '#272727',
      freeTextMaxWidth: {
        left: 65,
        right: 65,
        center: 90,
      },
    },
  },
  countdownStyle: CountdownStyle.BOLD,
  countdownFont: {
    family: "Courier New, monospace",
    size: 80,
    weight: 900,
  },
  countdownLayout: { x: 960, y: 540, scale: 1 },
  posterLayout: { x: 960, y: 540, scale: 1 },
  isGlobal: false,
};

/**
 * Refactored theme management component (orchestrator)
 */
export function ThemeManager() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeProfileThemeId, setActiveProfileThemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateThemeInput>>(DEFAULT_THEME_DATA);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadThemes();
    loadActiveProfile();
  }, []);

  const loadThemes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/themes");
      const data = await response.json();
      setThemes(data.themes || []);
    } catch (err) {
      setError("Failed to load themes");
    } finally {
      setLoading(false);
    }
  };

  const loadActiveProfile = async () => {
    try {
      const response = await fetch("/api/profiles");
      const data = await response.json();
      const activeProfile = data.profiles?.find(
        (p: { isActive: boolean; themeId: string }) => p.isActive
      );
      if (activeProfile) {
        setActiveProfileThemeId(activeProfile.themeId);
      }
    } catch (err) {
      console.error("Failed to load active profile:", err);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTheme(null);
    setFormData(DEFAULT_THEME_DATA);
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
      lowerThirdAnimation: theme.lowerThirdAnimation || DEFAULT_THEME_DATA.lowerThirdAnimation,
      countdownStyle: theme.countdownStyle,
      countdownFont: theme.countdownFont,
      countdownLayout: theme.countdownLayout || { x: 960, y: 540, scale: 1 },
      posterLayout: theme.posterLayout || { x: 960, y: 540, scale: 1 },
      isGlobal: theme.isGlobal,
    });
  };

  const handleSave = async () => {
    try {
      setError(null);

      if (isCreating) {
        const response = await fetch("/api/themes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create theme");
        }
      } else if (editingTheme) {
        const response = await fetch(`/api/themes/${editingTheme.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update theme");
        }
      }

      setIsCreating(false);
      setEditingTheme(null);
      await loadThemes();
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
      const response = await fetch(`/api/themes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete theme");
      }

      await loadThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete theme");
    }
  };

  const handleApplyTheme = async (themeId: string) => {
    try {
      setError(null);
      const response = await fetch("/api/profiles");
      const data = await response.json();
      const activeProfile = data.profiles?.find((p: { isActive: boolean }) => p.isActive);

      if (!activeProfile) {
        throw new Error("No active profile found");
      }

      const updateResponse = await fetch(`/api/profiles/${activeProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId }),
      });

      if (!updateResponse.ok) {
        const updateData = await updateResponse.json();
        throw new Error(updateData.error || "Failed to apply theme");
      }

      setActiveProfileThemeId(themeId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to apply theme";
      setError(message);
      alert(message);
    }
  };

  const testLowerThird = async () => {
    try {
      await fetch("/api/overlays/lower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "show",
          payload: {
            title: "Theme Preview",
            subtitle: "Testing new theme",
            side: "left",
            duration: 5,
          },
        }),
      });
    } catch (err) {
      console.error("Failed to test lower third:", err);
    }
  };

  const testCountdown = async () => {
    try {
      await fetch("/api/overlays/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          payload: { seconds: 300 },
        }),
      });

      await fetch("/api/overlays/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
    } catch (err) {
      console.error("Failed to test countdown:", err);
    }
  };

  const sendLivePreviewToOBS = async (data: Partial<CreateThemeInput>) => {
    if (!data.colors || !data.lowerThirdFont || !data.lowerThirdLayout) {
      return;
    }

    try {
      await fetch("/api/overlays/lower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
    } catch (err) {
      console.error("Failed to send live preview:", err);
    }
  };

  const hideLivePreview = async () => {
    try {
      await fetch("/api/overlays/lower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide", payload: {} }),
      });
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
        <ThemeEditorProvider
          initialData={formData}
          onOBSPreviewUpdate={sendLivePreviewToOBS}
        >
          <ThemeEditor
            isCreating={isCreating}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </ThemeEditorProvider>
      ) : (
        <ThemeList
          themes={themes}
          activeThemeId={activeProfileThemeId}
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
