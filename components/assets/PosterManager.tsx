"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/ui/tag-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PosterUploader } from "./PosterUploader";
import { VirtualizedPosterGrid } from "./VirtualizedPosterGrid";
import { Plus, Trash2, Upload, ChevronDown, ChevronUp, Image as ImageIcon, Video, Youtube, Loader2 } from "lucide-react";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: "image" | "video" | "youtube";
  tags: string[];
  isEnabled?: boolean;
  createdAt?: string;
}

/**
 * Poster management component with virtualized grids and advanced filters
 */
export function PosterManager() {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImageReplacer, setShowImageReplacer] = useState(false);
  const [showDisabled, setShowDisabled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video" | "youtube">("all");
  
  const [formData, setFormData] = useState({
    title: "",
    fileUrl: "",
    type: "image" as "image" | "video" | "youtube",
    tags: [] as string[],
  });
  // Track selected poster IDs for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  // Split posters by enabled status
  const enabledPosters = useMemo(() => posters.filter(p => p.isEnabled !== false), [posters]);
  const disabledPosters = useMemo(() => posters.filter(p => p.isEnabled === false), [posters]);

  // Filter enabled posters
  const filteredEnabledPosters = useMemo(() => {
    let filtered = enabledPosters;

    // Text search by title
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.title.toLowerCase().includes(query));
    }

    // Tag filter (AND logic - poster must have ALL selected tags)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTags.every((tag) =>
          p.tags.some((pt) => pt.toLowerCase() === tag.toLowerCase())
        )
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((p) => p.type === typeFilter);
    }

    return filtered;
  }, [enabledPosters, searchQuery, selectedTags, typeFilter]);

  // Filter posters for search combobox (show all, prioritize disabled)
  const filteredPostersForSearch = useMemo(() => {
    return posters
      .filter(poster => {
        const search = searchValue.toLowerCase();
        return (
          poster.title.toLowerCase().includes(search) ||
          poster.tags.some(tag => tag.toLowerCase().includes(search))
        );
      })
      .sort((a, b) => {
        // Disabled posters first in search results
        if (a.isEnabled === false && b.isEnabled !== false) return -1;
        if (a.isEnabled !== false && b.isEnabled === false) return 1;
        return 0;
      });
  }, [posters, searchValue]);

  // Stats
  const stats = useMemo(() => {
    const enabled = enabledPosters.length;
    const total = posters.length;
    const byType = {
      image: posters.filter(p => p.type === "image" && p.isEnabled !== false).length,
      video: posters.filter(p => p.type === "video" && p.isEnabled !== false).length,
      youtube: posters.filter(p => p.type === "youtube" && p.isEnabled !== false).length,
    };
    return { enabled, total, byType };
  }, [posters, enabledPosters]);

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
          fetchTagSuggestions();
          resetForm();
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
          fetchTagSuggestions();
          resetForm();
        }
      }
    } catch (error) {
      console.error("Failed to save poster:", error);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setShowUploader(false);
    setShowImageReplacer(false);
    setFormData({ title: "", fileUrl: "", type: "image", tags: [] });
  };

  const handleToggleEnabled = async (poster: Poster) => {
    try {
      await fetch(`/api/assets/posters/${poster.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !poster.isEnabled }),
      });
      fetchPosters();
    } catch (error) {
      console.error("Failed to toggle poster:", error);
    }
  };

  const handleDelete = async (poster: Poster) => {
    if (!confirm(`Delete "${poster.title}"?`)) return;

    try {
      await fetch(`/api/assets/posters/${poster.id}`, { method: "DELETE" });
      fetchPosters();
    } catch (error) {
      console.error("Failed to delete poster:", error);
    }
  };

  const handleEnableFromSearch = async (posterId: string) => {
    try {
      await fetch(`/api/assets/posters/${posterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: true }),
      });
      fetchPosters();
      setSearchOpen(false);
      setSearchValue("");
    } catch (error) {
      console.error("Failed to enable poster:", error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image": return <ImageIcon className="w-3 h-3" />;
      case "video": return <Video className="w-3 h-3" />;
      case "youtube": return <Youtube className="w-3 h-3" />;
      default: return null;
    }
  };

  const handleToggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} poster${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    setIsBulkDeleting(true);
    try {
      const response = await fetch('/api/assets/posters/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        setSelectedIds(new Set());
        fetchPosters();
      } else {
        console.error('Bulk delete failed');
      }
    } catch (error) {
      console.error('Failed to bulk delete posters:', error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (loading) {
    return <div>Loading posters...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Posters
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted-foreground">
              {stats.enabled} active · {stats.total} total
            </p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {getTypeIcon("image")} {stats.byType.image} images
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getTypeIcon("video")} {stats.byType.video} videos
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getTypeIcon("youtube")} {stats.byType.youtube} youtube
              </Badge>
            </div>
          </div>
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

      {/* Search Combobox - Enable Disabled Posters */}
      <div className="space-y-2">
        <Label htmlFor="poster-search">Enable a Poster</Label>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={searchOpen}
              className="w-full justify-between"
            >
              <span className="text-muted-foreground">
                Search to enable a disabled poster...
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search by title or tags..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>No posters found.</CommandEmpty>
                <CommandGroup heading="Posters">
                  {filteredPostersForSearch.map((poster) => (
                    <CommandItem
                      key={poster.id}
                      value={poster.title}
                      onSelect={() => {
                        if (poster.isEnabled === false) {
                          handleEnableFromSearch(poster.id);
                        } else {
                          setSearchOpen(false);
                        }
                      }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                        {poster.type === "image" ? (
                          <img
                            src={poster.fileUrl}
                            alt={poster.title}
                            className="w-full h-full object-cover"
                          />
                        ) : poster.type === "youtube" ? (
                          <div className="w-full h-full flex items-center justify-center bg-red-500/20">
                            <Youtube className="w-4 h-4 text-red-500" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-500/20">
                            <Video className="w-4 h-4 text-blue-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{poster.title}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-xs">
                            {poster.type}
                          </Badge>
                          {poster.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant={poster.isEnabled !== false ? "default" : "secondary"} className="text-xs">
                        {poster.isEnabled !== false ? "Active" : "Disabled"}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-48">
          <TagInput
            value={selectedTags}
            onChange={setSelectedTags}
            suggestions={tagSuggestions}
            placeholder="Filter by tags..."
          />
        </div>
        <div className="w-36">
          <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(searchQuery || selectedTags.length > 0 || typeFilter !== "all") && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedTags([]);
              setTypeFilter("all");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      {filteredEnabledPosters.length !== enabledPosters.length && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredEnabledPosters.length} of {enabledPosters.length} active posters
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
              <Label>Current Media</Label>
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
                Change Media
              </Button>
            </div>
          )}

          {/* Image Replacer (Edit Mode Only) */}
          {editingId && showImageReplacer && (
            <div className="space-y-2">
              <Label>Upload New Media</Label>
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
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Active Posters Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Active Posters</h3>
          <Badge variant="default">{filteredEnabledPosters.length}</Badge>
        </div>

        {filteredEnabledPosters.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {enabledPosters.length === 0
                ? "No active posters"
                : "No posters match your filters"}
            </p>
            <p className="text-sm text-muted-foreground">
              {enabledPosters.length === 0
                ? "Add a poster or enable one using the search above"
                : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          <VirtualizedPosterGrid
            posters={filteredEnabledPosters}
            variant="enabled"
            onEdit={handleEdit}
            onToggleEnabled={handleToggleEnabled}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
            isBulkDeleting={isBulkDeleting}
          />
        )}
      </div>

      {/* Disabled Posters Section (Collapsible) */}
      {disabledPosters.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => setShowDisabled(!showDisabled)}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">Disabled Posters</h3>
              <Badge variant="secondary">{disabledPosters.length}</Badge>
            </div>
            {showDisabled ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {showDisabled && (
            <VirtualizedPosterGrid
              posters={disabledPosters}
              variant="disabled"
              onEdit={handleEdit}
              onToggleEnabled={handleToggleEnabled}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              onToggleSelection={handleToggleSelection}
              isBulkDeleting={isBulkDeleting}
            />
          )}
        </div>
      )}

      {/* Bulk Action Toolbar - appears when items selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                        bg-background border rounded-lg shadow-lg p-4
                        flex items-center gap-4 min-w-[400px]">
          <div className="flex-1">
            <p className="font-medium">
              {selectedIds.size} poster{selectedIds.size !== 1 ? 's' : ''} selected
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleClearSelection}
            disabled={isBulkDeleting}
          >
            Clear
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
          >
            {isBulkDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
