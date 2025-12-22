"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input";
import { PosterUploader } from "./PosterUploader";
import { Plus, Trash2, Upload, Power, PowerOff } from "lucide-react";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: "image" | "video" | "youtube";
  tags: string[];
  isEnabled: boolean;
  createdAt: string;
}

/**
 * Poster management component
 */
export function PosterManager() {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    fileUrl: "",
    type: "image" as "image" | "video" | "youtube",
    tags: [] as string[],
  });

  useEffect(() => {
    fetchPosters();
    fetchTagSuggestions();
  }, []);

  const fetchPosters = async () => {
    try {
      const res = await fetch("/api/assets/posters");
      const data = await res.json();
      setPosters(data.posters || []);
    } catch (error) {
      console.error("Failed to fetch posters:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTagSuggestions = async () => {
    try {
      const res = await fetch("/api/assets/tags");
      const data = await res.json();
      setTagSuggestions(data.tags || []);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  const handleUploadComplete = (url: string, type: "image" | "video" | "youtube") => {
    setFormData({ ...formData, fileUrl: url, type });
    setShowUploader(false);
    setShowForm(true);
  };

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/assets/posters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchPosters();
        fetchTagSuggestions(); // Refresh autocomplete with new tags
        setShowForm(false);
        setShowUploader(false);
        setFormData({ title: "", fileUrl: "", type: "image", tags: [] });
      }
    } catch (error) {
      console.error("Failed to create poster:", error);
    }
  };

  const handleToggleEnabled = async (id: string, currentState: boolean) => {
    try {
      await fetch(`/api/assets/posters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !currentState }),
      });
      fetchPosters();
    } catch (error) {
      console.error("Failed to toggle poster:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this poster?")) return;

    try {
      await fetch(`/api/assets/posters/${id}`, { method: "DELETE" });
      fetchPosters();
    } catch (error) {
      console.error("Failed to delete poster:", error);
    }
  };

  if (loading) {
    return <div>Loading posters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Posters</h2>
          <p className="text-sm text-muted-foreground">
            Manage images and videos for your shows
          </p>
        </div>
        <Button onClick={() => setShowUploader(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Poster
        </Button>
      </div>

      {/* Upload Step */}
      {showUploader && (
        <PosterUploader
          onUpload={handleUploadComplete}
          onCancel={() => setShowUploader(false)}
        />
      )}

      {/* Title Form (after upload) */}
      {showForm && formData.fileUrl && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Badge>{formData.type}</Badge>
            <span className="text-sm text-muted-foreground truncate">
              {formData.fileUrl}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Poster Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter a title for this poster"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <TagInput
              value={formData.tags}
              onChange={(tags) => setFormData({ ...formData, tags })}
              suggestions={tagSuggestions}
              placeholder="Add tags..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!formData.title}>
              Save Poster
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setFormData({ title: "", fileUrl: "", type: "image", tags: [] });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Posters Grid */}
      {posters.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No posters yet</p>
          <p className="text-sm text-muted-foreground">
            Click &ldquo;Add Poster&rdquo; to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posters.map((poster) => (
            <div
              key={poster.id}
              className={`border rounded-lg overflow-hidden group relative ${
                !poster.isEnabled ? "opacity-50" : ""
              }`}
            >
              <div className="aspect-video bg-muted relative overflow-hidden">
                {poster.type === "image" ? (
                  <img
                    src={poster.fileUrl}
                    alt={poster.title}
                    className="w-full h-full object-cover"
                  />
                ) : poster.type === "youtube" ? (
                  <iframe
                    src={poster.fileUrl}
                    title={poster.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={poster.fileUrl}
                    className="w-full h-full object-cover"
                    controls={false}
                    muted
                    loop
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium truncate">{poster.title}</h3>
                  <Badge variant={poster.isEnabled ? "default" : "secondary"} className="text-xs">
                    {poster.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {poster.type}
                  </Badge>
                  {poster.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant={poster.isEnabled ? "outline" : "default"}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleEnabled(poster.id, poster.isEnabled)}
                  >
                    {poster.isEnabled ? (
                      <>
                        <PowerOff className="w-3 h-3 mr-2" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Power className="w-3 h-3 mr-2" />
                        Enable
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(poster.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

