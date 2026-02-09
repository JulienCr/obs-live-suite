"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EntityHeader } from "@/components/ui/EntityHeader";
import { EnableSearchCombobox } from "@/components/ui/EnableSearchCombobox";
import { PosterQuickAdd } from "@/components/assets/PosterQuickAdd";
import { TextPresetCard } from "./TextPresetCard";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { apiPost, apiGet } from "@/lib/utils/ClientFetch";
import { useTextPresets, type TextPreset } from "@/lib/queries";
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

const NAME_MAX_LENGTH = 100;
const BODY_MAX_LENGTH = 2000;
const IMAGE_ALT_MAX_LENGTH = 200;
const SEARCH_PREVIEW_LENGTH = 40;

const INITIAL_FORM_DATA = {
  name: "",
  body: "",
  side: "left" as "left" | "right" | "center",
  imageUrl: "",
  imageAlt: "",
};

export function TextPresetManager() {
  const t = useTranslations("assets.textPresets");
  const tCommon = useTranslations("common");

  const {
    textPresets,
    isLoading: loading,
    toggleEnabled,
    deleteTextPreset,
    createTextPreset,
    updateTextPreset,
  } = useTextPresets();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDisabled, setShowDisabled] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [lowerThirdDuration, setLowerThirdDuration] = useState(8);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Fetch overlay settings for lower third duration
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiGet<{ settings?: { lowerThirdDuration?: number } }>("/api/settings/overlay");
        if (data.settings?.lowerThirdDuration) {
          setLowerThirdDuration(data.settings.lowerThirdDuration);
        }
      } catch (error) {
        console.error("Failed to fetch overlay settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      imageUrl: formData.imageUrl || null,
      imageAlt: formData.imageAlt || null,
    };

    if (editingId) {
      updateTextPreset({ id: editingId, ...payload });
      setEditingId(null);
    } else {
      createTextPreset(payload);
    }

    setShowForm(false);
    resetForm();
  };

  const handleEdit = (preset: TextPreset) => {
    setEditingId(preset.id);
    setFormData({
      name: preset.name,
      body: preset.body,
      side: preset.side,
      imageUrl: preset.imageUrl || "",
      imageAlt: preset.imageAlt || "",
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const handleToggleEnabled = (preset: TextPreset) => {
    toggleEnabled({ id: preset.id, isEnabled: !preset.isEnabled });
  };

  const handleDelete = (preset: TextPreset) => {
    setDeleteTarget({ id: preset.id, name: preset.name });
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteTextPreset(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleQuickShow = async (preset: TextPreset) => {
    try {
      await apiPost<{ success: boolean }>(`/api/actions/lower/text-preset/${preset.id}`, {
        duration: lowerThirdDuration,
      });
    } catch (error) {
      console.error("Failed to show lower third:", error);
    }
  };

  const handleEnableFromSearch = (presetId: string) => {
    toggleEnabled({ id: presetId, isEnabled: true });
  };

  const enabledPresets = textPresets.filter(p => p.isEnabled);
  const disabledPresets = textPresets.filter(p => !p.isEnabled);

  if (loading) {
    return <div>{tCommon("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Actions */}
      <EntityHeader
        icon={FileText}
        title={t("title")}
        stats={t("activeCount", { count: enabledPresets.length, total: textPresets.length })}
        onAdd={() => {
          setEditingId(null);
          resetForm();
          setShowForm(!showForm);
        }}
        addLabel={t("addPreset")}
      />

      {/* Search Bar - Enable Disabled Presets */}
      <EnableSearchCombobox
        items={textPresets}
        onEnable={handleEnableFromSearch}
        getId={(p) => p.id}
        getName={(p) => p.name}
        getIsEnabled={(p) => p.isEnabled}
        label={t("enablePreset")}
        placeholder={t("searchToEnable")}
        searchPlaceholder={t("searchByName")}
        emptyMessage={t("noPresetsFound")}
        groupHeading={t("title")}
        renderItem={(preset) => (
          <>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{preset.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {preset.body.substring(0, SEARCH_PREVIEW_LENGTH)}
              </div>
            </div>
            <Badge variant={preset.isEnabled ? "default" : "secondary"} className="text-xs">
              {preset.isEnabled ? t("active") : t("disabled")}
            </Badge>
          </>
        )}
      />

      {/* Create/Edit Form */}
      {showForm && (
        <Alert>
          <AlertDescription>
            <div className="space-y-4 mt-2">
              <h3 className="font-medium">{editingId ? t("editPreset") : t("createPreset")}</h3>

              <div className="space-y-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("namePlaceholder")}
                  maxLength={NAME_MAX_LENGTH}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">{t("body")}</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder={t("bodyPlaceholder")}
                  className="min-h-[120px]"
                  maxLength={BODY_MAX_LENGTH}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.body.length}/{BODY_MAX_LENGTH}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t("side")}</Label>
                <div className="flex gap-2">
                  {(["left", "right", "center"] as const).map((s) => (
                    <Button
                      key={s}
                      variant={formData.side === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, side: s })}
                      className="flex-1"
                    >
                      {t(`side_${s}`)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("imageOptional")}</Label>
                <PosterQuickAdd
                  mode="picker"
                  allowedTypes={["image"]}
                  title={t("quickAddImage")}
                  showTitleEditor={false}
                  onMediaSelected={(media) => {
                    setFormData({ ...formData, imageUrl: media.fileUrl, imageAlt: media.title || "" });
                  }}
                />
                {formData.imageUrl && (
                  <div className="flex items-center gap-3 rounded border border-input bg-muted/50 p-2">
                    <img
                      src={formData.imageUrl}
                      alt={formData.imageAlt || ""}
                      className="h-16 w-28 rounded object-cover"
                    />
                    <div className="flex-1">
                      <Input
                        value={formData.imageAlt}
                        onChange={(e) => setFormData({ ...formData, imageAlt: e.target.value })}
                        placeholder={t("imageAltPlaceholder")}
                        className="text-xs"
                        maxLength={IMAGE_ALT_MAX_LENGTH}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, imageUrl: "", imageAlt: "" })}
                    >
                      {tCommon("clear")}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={!formData.name || !formData.body}>
                  {editingId ? t("updatePreset") : t("createPreset")}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  {tCommon("cancel")}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Presets Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{t("activePresets")}</h3>
          <Badge variant="default">{enabledPresets.length}</Badge>
        </div>

        {enabledPresets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("noActivePresets")}</p>
            <p className="text-sm text-muted-foreground">{t("addOrEnable")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {enabledPresets.map((preset) => (
              <TextPresetCard
                key={preset.id}
                preset={preset}
                variant="enabled"
                onQuickShow={handleQuickShow}
                onEdit={handleEdit}
                onToggleEnabled={handleToggleEnabled}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Disabled Presets Section (Collapsible) */}
      {disabledPresets.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => setShowDisabled(!showDisabled)}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">{t("disabledPresets")}</h3>
              <Badge variant="secondary">{disabledPresets.length}</Badge>
            </div>
            {showDisabled ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {showDisabled && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {disabledPresets.map((preset) => (
                <TextPresetCard
                  key={preset.id}
                  preset={preset}
                  variant="disabled"
                  onEdit={handleEdit}
                  onToggleEnabled={handleToggleEnabled}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
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
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t("deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
