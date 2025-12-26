"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Palette, Plus, Edit2, Trash2, Check, X, Eye, Zap, Play, RotateCcw } from "lucide-react";
import {
  Theme,
  LowerThirdTemplate,
  CountdownStyle,
  CreateThemeInput,
} from "@/lib/models/Theme";
import { LowerThirdPreview, CountdownPreview } from "./ThemePreviews";
import { OverlayCanvas } from "./OverlayCanvas";
import { LowerThirdAnimationEditor } from "./LowerThirdAnimationEditor";

/**
 * Theme management component
 */
export function ThemeManager() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeProfileThemeId, setActiveProfileThemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateThemeInput>>({
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
  });
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
      const activeProfile = data.profiles?.find((p: { isActive: boolean; themeId: string }) => p.isActive);
      if (activeProfile) {
        setActiveProfileThemeId(activeProfile.themeId);
      }
    } catch (err) {
      console.error("Failed to load active profile:", err);
    }
  };

  // Real-time OBS preview: Show overlay when editing starts, update on changes
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isEditingRef = useRef(false);

  const sendLivePreviewToOBS = async () => {
    if (!formData.colors || !formData.lowerThirdFont || !formData.lowerThirdLayout) {
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
            subtitle: formData.name || "Theme Editor",
            side: "left",
            duration: 999999, // Keep visible indefinitely
            theme: {
              colors: formData.colors,
              template: formData.lowerThirdTemplate,
              font: formData.lowerThirdFont,
              layout: formData.lowerThirdLayout,
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

  // Show overlay when editing starts
  useEffect(() => {
    const isNowEditing = isCreating || editingTheme !== null;
    
    if (isNowEditing && !isEditingRef.current) {
      // Just started editing
      isEditingRef.current = true;
      sendLivePreviewToOBS();
    } else if (!isNowEditing && isEditingRef.current) {
      // Just stopped editing
      isEditingRef.current = false;
      hideLivePreview();
    }
  }, [isCreating, editingTheme]);

  // Update overlay when formData changes (debounced)
  useEffect(() => {
    if (!isEditingRef.current) return;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      sendLivePreviewToOBS();
    }, 300); // 300ms debounce

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [formData]);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTheme(null);
    setFormData({
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
    });
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
      lowerThirdAnimation: theme.lowerThirdAnimation || {
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
        },
      },
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
      
      // Get active profile
      const profilesResponse = await fetch("/api/profiles");
      const profilesData = await profilesResponse.json();
      const activeProfile = profilesData.profiles?.find((p: { isActive: boolean; id: string }) => p.isActive);
      
      if (!activeProfile) {
        throw new Error("No active profile found. Please create a profile first.");
      }

      // Update profile with new theme
      const response = await fetch(`/api/profiles/${activeProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...activeProfile,
          themeId: themeId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to apply theme");
      }

      setActiveProfileThemeId(themeId);
      
      // Show success with preview option
      if (confirm("Theme applied! Click OK to preview the lower third, or Cancel to continue editing.")) {
        await testLowerThird();
      }
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
      // First set the countdown
      await fetch("/api/overlays/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          payload: {
            seconds: 300, // 5 minutes
          },
        }),
      });
      
      // Then start it
      await fetch("/api/overlays/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
        }),
      });
    } catch (err) {
      console.error("Failed to test countdown:", err);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTheme(null);
    setError(null);
  };

  const updateColor = (key: keyof typeof formData.colors, value: string) => {
    setFormData((prev) => ({
      ...prev,
      colors: {
        ...prev.colors!,
        [key]: value,
      },
    }));
  };

  const updateLowerThirdFont = (
    key: "family" | "size" | "weight",
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      lowerThirdFont: {
        ...prev.lowerThirdFont!,
        [key]: value,
      },
    }));
  };

  const updateCountdownFont = (
    key: "family" | "size" | "weight",
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      countdownFont: {
        ...prev.countdownFont!,
        [key]: value,
      },
    }));
  };

  // Reset functions - restore to default values
  const resetColors = () => {
    setFormData((prev) => ({
      ...prev,
      colors: {
        primary: "#3B82F6",
        accent: "#60A5FA",
        surface: "#1E293B",
        text: "#F8FAFC",
        success: "#10B981",
        warn: "#F59E0B",
      },
    }));
  };

  const resetLowerThirdFont = () => {
    setFormData((prev) => ({
      ...prev,
      lowerThirdFont: {
        family: "Inter, sans-serif",
        size: 28,
        weight: 700,
      },
    }));
  };

  const resetLowerThirdLayout = () => {
    setFormData((prev) => ({
      ...prev,
      lowerThirdLayout: { x: 60, y: 920, scale: 1 },
    }));
  };

  const resetCountdownFont = () => {
    setFormData((prev) => ({
      ...prev,
      countdownFont: {
        family: "Courier New, monospace",
        size: 80,
        weight: 900,
      },
    }));
  };

  const resetCountdownLayout = () => {
    setFormData((prev) => ({
      ...prev,
      countdownLayout: { x: 960, y: 540, scale: 1 },
    }));
  };

  const resetPosterLayout = () => {
    setFormData((prev) => ({
      ...prev,
      posterLayout: { x: 960, y: 540, scale: 1 },
    }));
  };

  if (loading) {
    return <div className="p-6">Loading themes...</div>;
  }

  const isEditing = isCreating || editingTheme !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Palette className="w-6 h-6" />
            Themes
          </h2>
          <p className="text-sm text-muted-foreground">
            Customize colors, fonts, and styles for your overlays
          </p>
          {activeProfileThemeId && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                Active: {themes.find(t => t.id === activeProfileThemeId)?.name || "Unknown"}
              </Badge>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={testLowerThird}
                  title="Test Lower Third with current theme"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Test Lower Third
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={testCountdown}
                  title="Test Countdown with current theme"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Test Countdown
                </Button>
              </div>
            </div>
          )}
        </div>
        {!isEditing && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Theme
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isEditing ? (
        <div className="space-y-6">
          {/* Live Preview Canvas - Full Width */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Live Preview Canvas (16:9)
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag overlays to position them. Use +/- buttons to scale. Undo/Redo with Ctrl+Z/Y.
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Live in OBS
              </Badge>
            </div>
            {formData.colors && formData.lowerThirdFont && formData.countdownFont && (
              <OverlayCanvas
                lowerThirdColors={formData.colors}
                lowerThirdFont={formData.lowerThirdFont}
                lowerThirdLayout={formData.lowerThirdLayout || { x: 60, y: 920, scale: 1 }}
                lowerThirdAnimation={formData.lowerThirdAnimation}
                onLowerThirdLayoutChange={(layout) =>
                  setFormData((prev) => ({ ...prev, lowerThirdLayout: layout }))
                }
                countdownColors={formData.colors}
                countdownFont={formData.countdownFont}
                countdownStyle={formData.countdownStyle || CountdownStyle.BOLD}
                countdownLayout={formData.countdownLayout || { x: 960, y: 540, scale: 1 }}
                onCountdownLayoutChange={(layout) =>
                  setFormData((prev) => ({ ...prev, countdownLayout: layout }))
                }
              />
            )}
          </Card>

          {/* Theme Settings - Full Width Below */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {isCreating ? "Create New Theme" : "Edit Theme"}
            </h3>

            <div className="space-y-6">
            {/* Theme Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Theme Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter theme name"
              />
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Colors</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetColors}
                  className="h-8 px-2 text-xs"
                  title="Reset colors to default"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(formData.colors || {}).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key} className="capitalize text-xs">
                      {key}
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id={key}
                        value={value}
                        onChange={(e) =>
                          updateColor(
                            key as keyof typeof formData.colors,
                            e.target.value
                          )
                        }
                        className="w-12 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={value}
                        onChange={(e) =>
                          updateColor(
                            key as keyof typeof formData.colors,
                            e.target.value
                          )
                        }
                        className="flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lower Third Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Lower Third</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={resetLowerThirdFont}
                    className="h-8 px-2 text-xs"
                    title="Reset font to default"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset Font
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={resetLowerThirdLayout}
                    className="h-8 px-2 text-xs"
                    title="Reset position to default"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset Position
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lowerThirdTemplate">Template</Label>
                  <Select
                    value={formData.lowerThirdTemplate}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        lowerThirdTemplate: value as LowerThirdTemplate,
                      }))
                    }
                  >
                    <SelectTrigger id="lowerThirdTemplate">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LowerThirdTemplate.CLASSIC}>Classic</SelectItem>
                      <SelectItem value={LowerThirdTemplate.BAR}>Bar</SelectItem>
                      <SelectItem value={LowerThirdTemplate.CARD}>Card</SelectItem>
                      <SelectItem value={LowerThirdTemplate.SLIDE}>Slide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowerThirdFontFamily">Font Family</Label>
                  <Input
                    id="lowerThirdFontFamily"
                    value={formData.lowerThirdFont?.family}
                    onChange={(e) =>
                      updateLowerThirdFont("family", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowerThirdFontSize">Font Size (px)</Label>
                  <Input
                    id="lowerThirdFontSize"
                    type="number"
                    value={formData.lowerThirdFont?.size}
                    onChange={(e) =>
                      updateLowerThirdFont("size", parseInt(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowerThirdFontWeight">Font Weight</Label>
                  <Select
                    value={formData.lowerThirdFont?.weight?.toString()}
                    onValueChange={(value) =>
                      updateLowerThirdFont("weight", parseInt(value))
                    }
                  >
                    <SelectTrigger id="lowerThirdFontWeight">
                      <SelectValue placeholder="Select weight" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Light (300)</SelectItem>
                      <SelectItem value="400">Regular (400)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="600">Semi Bold (600)</SelectItem>
                      <SelectItem value="700">Bold (700)</SelectItem>
                      <SelectItem value="800">Extra Bold (800)</SelectItem>
                      <SelectItem value="900">Black (900)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Lower Third Animation Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Lower Third Animation</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
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
                        },
                      },
                    }));
                  }}
                  className="h-8 px-2 text-xs"
                  title="Reset animation settings to default"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Animation
                </Button>
              </div>
              {formData.lowerThirdAnimation && formData.colors && (
                <LowerThirdAnimationEditor
                  value={formData.lowerThirdAnimation}
                  themeColors={formData.colors}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, lowerThirdAnimation: value }))
                  }
                />
              )}
            </div>

            {/* Countdown Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Countdown</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={resetCountdownFont}
                    className="h-8 px-2 text-xs"
                    title="Reset font to default"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset Font
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={resetCountdownLayout}
                    className="h-8 px-2 text-xs"
                    title="Reset position to default"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset Position
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countdownStyle">Style</Label>
                  <Select
                    value={formData.countdownStyle}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        countdownStyle: value as CountdownStyle,
                      }))
                    }
                  >
                    <SelectTrigger id="countdownStyle">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CountdownStyle.BOLD}>Bold (Center)</SelectItem>
                      <SelectItem value={CountdownStyle.CORNER}>Corner</SelectItem>
                      <SelectItem value={CountdownStyle.BANNER}>Banner (Top)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="countdownFontFamily">Font Family</Label>
                  <Input
                    id="countdownFontFamily"
                    value={formData.countdownFont?.family}
                    onChange={(e) =>
                      updateCountdownFont("family", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="countdownFontSize">Font Size (px)</Label>
                  <Input
                    id="countdownFontSize"
                    type="number"
                    value={formData.countdownFont?.size}
                    onChange={(e) =>
                      updateCountdownFont("size", parseInt(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="countdownFontWeight">Font Weight</Label>
                  <Select
                    value={formData.countdownFont?.weight?.toString()}
                    onValueChange={(value) =>
                      updateCountdownFont("weight", parseInt(value))
                    }
                  >
                    <SelectTrigger id="countdownFontWeight">
                      <SelectValue placeholder="Select weight" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Light (300)</SelectItem>
                      <SelectItem value="400">Regular (400)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="600">Semi Bold (600)</SelectItem>
                      <SelectItem value="700">Bold (700)</SelectItem>
                      <SelectItem value="800">Extra Bold (800)</SelectItem>
                      <SelectItem value="900">Black (900)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Poster Positioning */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Poster Position</h4>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetPosterLayout}
                  className="h-8 px-2 text-xs"
                  title="Reset position to default"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Position
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="posterOffsetX">Horizontal Offset (px)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="posterOffsetX"
                    type="range"
                    min="0"
                    max="1920"
                    step="10"
                    value={formData.posterLayout?.x || 960}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        posterLayout: {
                          ...prev.posterLayout!,
                          x: parseInt(e.target.value),
                        },
                      }))
                    }
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={formData.posterLayout?.x || 960}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        posterLayout: {
                          ...prev.posterLayout!,
                          x: parseInt(e.target.value),
                        },
                      }))
                    }
                    className="w-20"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Center = 960px. Lower values shift left, higher values shift right.
                </p>
              </div>
            </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Check className="w-4 h-4 mr-2" />
                  Save Theme
                </Button>
              </div>
            </div>
          </Card>

          {/* Color Reference */}
          <Card className="p-6">
            <h4 className="text-sm font-semibold mb-3">Color Guide</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: formData.colors?.primary }} />
                <div>
                  <div className="font-medium">Primary</div>
                  <div className="text-muted-foreground">Main color</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: formData.colors?.accent }} />
                <div>
                  <div className="font-medium">Accent</div>
                  <div className="text-muted-foreground">Highlights</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: formData.colors?.surface }} />
                <div>
                  <div className="font-medium">Surface</div>
                  <div className="text-muted-foreground">Background</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: formData.colors?.text }} />
                <div>
                  <div className="font-medium">Text</div>
                  <div className="text-muted-foreground">Text color</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: formData.colors?.success }} />
                <div>
                  <div className="font-medium">Success</div>
                  <div className="text-muted-foreground">Success</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: formData.colors?.warn }} />
                <div>
                  <div className="font-medium">Warn</div>
                  <div className="text-muted-foreground">Urgency</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <Card key={theme.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{theme.name}</h3>
                      {theme.id === activeProfileThemeId && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    {theme.isGlobal && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Global
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(theme)}
                      title="Edit theme"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {!theme.isGlobal && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(theme.id)}
                        title="Delete theme"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mini Preview */}
                <div className="border rounded p-2 bg-muted/30">
                  <div className="text-[10px] text-muted-foreground mb-1">Preview</div>
                  <div 
                    className="h-16 rounded flex items-center gap-2 px-2"
                    style={{
                      background: `linear-gradient(90deg, ${theme.colors.surface}E6 0%, ${theme.colors.surface}D9 100%)`
                    }}
                  >
                    <div
                      className="w-1 h-8 rounded"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div className="flex-1">
                      <div
                        className="text-xs font-bold"
                        style={{
                          fontFamily: theme.lowerThirdFont.family,
                          color: theme.colors.text
                        }}
                      >
                        Sample Text
                      </div>
                      <div
                        className="text-[10px]"
                        style={{
                          fontFamily: theme.countdownFont.family,
                          background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.accent} 100%)`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        00:00
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Colors
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(theme.colors).map(([key, value]) => (
                      <div
                        key={key}
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: value }}
                        title={`${key}: ${value}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lower Third:</span>
                    <span className="font-medium capitalize">
                      {theme.lowerThirdTemplate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Countdown:</span>
                    <span className="font-medium capitalize">{theme.countdownStyle}</span>
                  </div>
                </div>

                {/* Apply/Test Theme Buttons */}
                <div className="flex gap-2 mt-2">
                  {theme.id !== activeProfileThemeId ? (
                    <Button
                      className="flex-1"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyTheme(theme.id)}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Apply Theme
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="flex-1"
                        variant="outline"
                        size="sm"
                        onClick={testLowerThird}
                        title="Test Lower Third"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Test L3
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        size="sm"
                        onClick={testCountdown}
                        title="Test Countdown"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Test CD
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {themes.length === 0 && !isEditing && (
        <Card className="p-12 text-center">
          <Palette className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No themes available</p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Theme
          </Button>
        </Card>
      )}
    </div>
  );
}
