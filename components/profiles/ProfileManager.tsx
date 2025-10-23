"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Check, Folder, Edit, X } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  description?: string;
  themeId: string;
  isActive: boolean;
  createdAt: string;
}

interface Theme {
  id: string;
  name: string;
  isGlobal: boolean;
}

/**
 * Profile management component
 */
export function ProfileManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    themeId: "",
  });

  useEffect(() => {
    fetchProfiles();
    fetchThemes();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThemes = async () => {
    try {
      const res = await fetch("/api/themes");
      const data = await res.json();
      setThemes(data.themes || []);
      // Set default theme if not already set
      if (data.themes && data.themes.length > 0 && !formData.themeId) {
        setFormData(prev => ({ ...prev, themeId: data.themes[0].id }));
      }
    } catch (error) {
      console.error("Failed to fetch themes:", error);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          isActive: profiles.length === 0, // First profile is active
        }),
      });

      if (res.ok) {
        fetchProfiles();
        setShowForm(false);
        setEditingProfile(null);
        setFormData({ name: "", description: "", themeId: themes[0]?.id || "" });
      }
    } catch (error) {
      console.error("Failed to create profile:", error);
    }
  };

  const handleUpdate = async () => {
    if (!editingProfile) return;

    try {
      const res = await fetch(`/api/profiles/${editingProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchProfiles();
        setShowForm(false);
        setEditingProfile(null);
        setFormData({ name: "", description: "", themeId: themes[0]?.id || "" });
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
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
      await fetch(`/api/profiles/${id}/activate`, { method: "POST" });
      fetchProfiles();
    } catch (error) {
      console.error("Failed to activate profile:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this profile? This action cannot be undone.")) return;

    try {
      await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      fetchProfiles();
    } catch (error) {
      console.error("Failed to delete profile:", error);
    }
  };

  if (loading) {
    return <div>Loading profiles...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Show Profiles</h2>
          <p className="text-sm text-muted-foreground">
            Create different profiles for different shows
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          New Profile
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Alert>
          <AlertDescription>
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">
                  {editingProfile ? "Edit Profile" : "Create New Profile"}
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
                <Label htmlFor="name">Profile Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="My Show Profile"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Profile description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  id="theme"
                  value={formData.themeId}
                  onChange={(e) =>
                    setFormData({ ...formData, themeId: e.target.value })
                  }
                >
                  {themes.length === 0 ? (
                    <option value="">No themes available</option>
                  ) : (
                    themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name} {theme.isGlobal ? "(Global)" : ""}
                      </option>
                    ))
                  )}
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={editingProfile ? handleUpdate : handleCreate}
                  disabled={!formData.name || !formData.themeId}
                >
                  {editingProfile ? "Update Profile" : "Create Profile"}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
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
          <p className="text-muted-foreground">No profiles yet</p>
          <p className="text-sm text-muted-foreground">
            Click &ldquo;New Profile&rdquo; to create one
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
                        Active
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
                    Activate
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(profile)}
                >
                  <Edit className="w-3 h-3 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(profile.id)}
                  disabled={profile.isActive}
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

