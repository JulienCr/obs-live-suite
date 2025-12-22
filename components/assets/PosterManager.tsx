"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input";
import { PosterUploader } from "./PosterUploader";
import { Plus, Trash2, Upload, Power, PowerOff, Edit } from "lucide-react";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showImageReplacer, setShowImageReplacer] = useState(false);
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

  // Filter posters by search query and selected tags
  const filteredPosters = useMemo(() => {
    let filtered = posters;

    // Text search by title
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(query)
      );
    }

    // Tag filter (AND logic - poster must have ALL selected tags)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTags.every((tag) =>
          p.tags.some((pt) => pt.toLowerCase() === tag.toLowerCase())
        )
      );
    }

    return filtered;
  }, [posters, searchQuery, selectedTags]);

  const handleUploadComplete = (url: string, type: "image" | "video" | "youtube") => {
    setFormData({ ...formData, fileUrl: url, type });
    setShowUploader(false);
    setShowImageReplacer(false);
    setShowForm(true);
  };

  const handleEdit = (poster: Poster) => {
    setEditingId(poster.id);
    setFormData({
      title: poster.title,
      fileUrl: poster.fileUrl,
      type: poster.type,
      tags: poster.tags,
    });
    setShowForm(true);
    setShowUploader(false);
    setShowImageReplacer(false);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        // Update existing poster
        const res = await fetch(`/api/assets/posters/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          fetchPosters();
          fetchTagSuggestions(); // Refresh autocomplete with new tags
          setShowForm(false);
          setEditingId(null);
          setShowUploader(false);
          setShowImageReplacer(false);
          setFormData({ title: "", fileUrl: "", type: "image", tags: [] });
        }
      } else {
        // Create new poster
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
          setShowImageReplacer(false);
          setFormData({ title: "", fileUrl: "", type: "image", tags: [] });
        }
      }
    } catch (error) {
      console.error("Failed to save poster:", error);
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
        <Button
          onClick={() => {
            setEditingId(null);
            setShowForm(false);
            setShowImageReplacer(false);
            setFormData({ title: "", fileUrl: "", type: "image", tags: [] });
            setShowUploader(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Poster
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search posters by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-64">
          <TagInput
            value={selectedTags}
            onChange={setSelectedTags}
            suggestions={tagSuggestions}
            placeholder="Filter by tags..."
          />
        </div>
        {(searchQuery || selectedTags.length > 0) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedTags([]);
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      {filteredPosters.length !== posters.length && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredPosters.length} of {posters.length} posters
        </div>
      )}

      {/* Upload Step */}
      {showUploader && (
        <PosterUploader
          onUpload={handleUploadComplete}
          onCancel={() => setShowUploader(false)}
        />
      )}

      {/* Create/Edit Form */}
      {showForm && formData.fileUrl && (
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-lg">
            {editingId ? "Edit Poster" : "Upload Poster"}
          </h3>

          {/* Current Image Preview (Edit Mode Only) */}
          {editingId && !showImageReplacer && (
            <div className="space-y-2">
              <Label>Current Image/Video</Label>
              <div className="border rounded-lg overflow-hidden bg-muted">
                <div className="aspect-video relative">
                  {formData.type === "image" ? (
                    <img
                      src={formData.fileUrl}
                      alt={formData.title}
                      className="w-full h-full object-contain"
                    />
                  ) : formData.type === "youtube" ? (
                    <iframe
                      src={formData.fileUrl}
                      title={formData.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={formData.fileUrl}
                      className="w-full h-full object-contain"
                      controls
                    />
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImageReplacer(true)}
              >
                <Upload className="w-3 h-3 mr-2" />
                Change Image/Video
              </Button>
            </div>
          )}

          {/* Image Replacer (Edit Mode Only, when showImageReplacer is true) */}
          {editingId && showImageReplacer && (
            <div className="space-y-2">
              <Label>Upload New Image/Video</Label>
              <PosterUploader
                onUpload={handleUploadComplete}
                onCancel={() => setShowImageReplacer(false)}
              />
            </div>
          )}

          {/* File Info (Create Mode Only) */}
          {!editingId && (
            <div className="flex items-center gap-2">
              <Badge>{formData.type}</Badge>
              <span className="text-sm text-muted-foreground truncate">
                {formData.fileUrl}
              </span>
            </div>
          )}

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
            <Button onClick={handleSubmit} disabled={!formData.title}>
              {editingId ? "Update Poster" : "Save Poster"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setShowImageReplacer(false);
                setFormData({ title: "", fileUrl: "", type: "image", tags: [] });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Posters Grid */}
      {filteredPosters.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {posters.length === 0
              ? "No posters yet"
              : "No posters match your filters"}
          </p>
          <p className="text-sm text-muted-foreground">
            {posters.length === 0
              ? 'Click "Add Poster" to get started'
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosters.map((poster) => (
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
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(poster)}
                  >
                    <Edit className="w-3 h-3 mr-2" />
                    Edit
                  </Button>
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

