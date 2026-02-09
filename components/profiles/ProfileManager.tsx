"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Check, Folder, Edit, X } from "lucide-react";
import { isClientFetchError } from "@/lib/utils/ClientFetch";
import { useProfiles, useThemes, type Profile } from "@/lib/queries";

/**
 * Profile management component
 */
export function ProfileManager() {
  const t = useTranslations("profiles");

  const {
    profiles,
    isLoading: loading,
    activateProfileAsync,
    createProfileAsync,
    updateProfileAsync,
    deleteProfileAsync,
  } = useProfiles();

  const { themes } = useThemes();

  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    themeId: "",
  });

  // Set default theme when themes load and no theme is selected yet
  useEffect(() => {
    if (themes.length > 0 && !formData.themeId) {
      setFormData(prev => ({ ...prev, themeId: themes[0].id }));
    }
  }, [themes]);

  const handleCreate = async () => {
    try {
      await createProfileAsync({
        ...formData,
        isActive: profiles.length === 0, // First profile is active
      });
      setShowForm(false);
      setEditingProfile(null);
      setFormData({ name: "", description: "", themeId: themes[0]?.id || "" });
    } catch (error) {
      if (isClientFetchError(error)) {
        console.error(`Failed to create profile (${error.status}):`, error.errorMessage);
      } else {
        console.error("Failed to create profile:", error);
      }
    }
  };

  const handleUpdate = async () => {
    if (!editingProfile) return;

    try {
      await updateProfileAsync({
        id: editingProfile.id,
        ...formData,
      });
      setShowForm(false);
      setEditingProfile(null);
      setFormData({ name: "", description: "", themeId: themes[0]?.id || "" });
    } catch (error) {
      if (isClientFetchError(error)) {
        console.error(`Failed to update profile (${error.status}):`, error.errorMessage);
      } else {
        console.error("Failed to update profile:", error);
      }
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || "",
      themeId: profile.themeId,
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingProfile(null);
    setFormData({ name: "", description: "", themeId: themes[0]?.id || "" });
  };

  const handleActivate = async (id: string) => {
    try {
      await activateProfileAsync(id);
    } catch (error) {
      if (isClientFetchError(error)) {
        console.error(`Failed to activate profile (${error.status}):`, error.errorMessage);
      } else {
        console.error("Failed to activate profile:", error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteProfileAsync(id);
    } catch (error) {
      console.error("Failed to delete profile:", error);
    }
  };

  if (loading) {
    return <div>{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("newProfile")}
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Alert>
          <AlertDescription>
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">
                  {editingProfile ? t("editProfile") : t("createNewProfile")}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t("profileName")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("profileNamePlaceholder")}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("descriptionOptional")}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("descriptionPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">{t("theme")}</Label>
                <Select
                  value={formData.themeId}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, themeId: value })
                  }
                >
                  <SelectTrigger id="theme">
                    <SelectValue placeholder={t("noThemes")} />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.name} {theme.isGlobal ? t("global") : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={editingProfile ? handleUpdate : handleCreate}
                  disabled={!formData.name || !formData.themeId}
                >
                  {editingProfile ? t("updateProfile") : t("createProfile")}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Profiles List */}
      {profiles.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t("noProfiles")}</p>
          <p className="text-sm text-muted-foreground">
            {t("noProfilesHelp")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`
                border rounded-lg p-4 flex items-center justify-between
                ${profile.isActive ? "border-primary bg-primary/5" : ""}
              `}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${profile.isActive ? "bg-primary" : "bg-muted"}
                  `}
                >
                  <Folder
                    className={`w-5 h-5 ${
                      profile.isActive ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{profile.name}</h3>
                    {profile.isActive && (
                      <Badge variant="default">
                        <Check className="w-3 h-3 mr-1" />
                        {t("active")}
                      </Badge>
                    )}
                  </div>
                  {profile.description && (
                    <p className="text-sm text-muted-foreground">
                      {profile.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {!profile.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleActivate(profile.id)}
                  >
                    <Check className="w-3 h-3 mr-2" />
                    {t("activate")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(profile)}
                >
                  <Edit className="w-3 h-3 mr-2" />
                  {t("edit")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(profile.id)}
                  disabled={profile.isActive}
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

