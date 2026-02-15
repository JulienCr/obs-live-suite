"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityHeader } from "@/components/ui/EntityHeader";
import { EnableSearchCombobox } from "@/components/ui/EnableSearchCombobox";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PosterUploader } from "./PosterUploader";
import { VirtualizedPosterGrid } from "./VirtualizedPosterGrid";
import { Trash2, Upload, Image as ImageIcon, Video, Youtube, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/utils/ClientFetch";
import { usePosters, type Poster } from "@/lib/queries";

/**
 * Poster management component with virtualized grids and advanced filters
 */
export function PosterManager() {
  const t = useTranslations("assets.posters");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const {
    posters,
    isLoading: loading,
    toggleEnabled,
    deletePoster,
    createPosterAsync,
    bulkDelete,
    isBulkDeleting,
  } = usePosters();

  const [showUploader, setShowUploader] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video" | "youtube">("all");

  // Track selected poster IDs for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTagSuggestions();
  }, []);

  const fetchTagSuggestions = async () => {
    try {
      const data = await apiGet<{ tags: string[] }>("/api/assets/tags");
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

  const handleUploadComplete = async (
    url: string,
    type: "image" | "video" | "youtube",
    duration?: number
  ) => {
    // Create the poster directly
    try {
      let title = "";
      if (type === "youtube") {
        try {
          const data = await apiGet<{ title?: string }>(`/api/utils/metadata?url=${encodeURIComponent(url)}`);
          if (data.title) title = data.title;
        } catch {}
      }

      const poster = await createPosterAsync({
        title: title || "New Poster",
        fileUrl: url,
        type,
        tags: [],
        duration: duration ?? null,
      });

      // Navigate to detail page for editing
      router.push(`/assets/posters/${poster.id}`);
    } catch (error) {
      console.error("Failed to create poster:", error);
    }
    setShowUploader(false);
  };

  const handleToggleEnabled = (poster: Poster) => {
    toggleEnabled({ id: poster.id, isEnabled: !poster.isEnabled });
  };

  const handleDelete = async (poster: Poster) => {
    if (!confirm(`Delete "${poster.title}"?`)) return;
    deletePoster(poster.id);
  };

  const handleEnableFromSearch = (posterId: string) => {
    toggleEnabled({ id: posterId, isEnabled: true });
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

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} poster${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    bulkDelete(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set()),
    });
  };

  if (loading) {
    return <div>{tCommon("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Actions */}
      <EntityHeader
        icon={Upload}
        title={t("title")}
        stats={
          <div className="flex items-center gap-3">
            <span>{stats.enabled} active · {stats.total} total</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {getTypeIcon("image")} {stats.byType.image} {t("images").toLowerCase()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getTypeIcon("video")} {stats.byType.video} {t("videos").toLowerCase()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getTypeIcon("youtube")} {stats.byType.youtube} youtube
              </Badge>
            </div>
          </div>
        }
        onAdd={() => setShowUploader(true)}
        addLabel={t("addPoster")}
      />

      {/* Search Combobox - Enable Disabled Posters */}
      <EnableSearchCombobox
        items={posters}
        onEnable={handleEnableFromSearch}
        getId={(p) => p.id}
        getName={(p) => `${p.title} ${p.tags.join(" ")}`}
        getIsEnabled={(p) => p.isEnabled !== false}
        label={t("enablePoster")}
        placeholder={t("searchToEnable")}
        searchPlaceholder={t("searchByTitleTags")}
        emptyMessage={t("noPostersFound")}
        groupHeading={t("title")}
        renderItem={(poster) => (
          <>
            <div className="w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
              {poster.type === "image" ? (
                <img src={poster.fileUrl} alt={poster.title} className="w-full h-full object-cover" />
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
                <Badge variant="outline" className="text-xs">{poster.type}</Badge>
                {poster.tags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
            <Badge variant={poster.isEnabled !== false ? "default" : "secondary"} className="text-xs">
              {poster.isEnabled !== false ? t("active") : t("disabled")}
            </Badge>
          </>
        )}
      />

      {/* Filter Bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t("searchByTitle")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-48">
          <TagInput
            value={selectedTags}
            onChange={setSelectedTags}
            suggestions={tagSuggestions}
            placeholder={t("filterByTags")}
          />
        </div>
        <div className="w-36">
          <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTypes")}</SelectItem>
              <SelectItem value="image">{t("images")}</SelectItem>
              <SelectItem value="video">{t("videos")}</SelectItem>
              <SelectItem value="youtube">{t("youtube")}</SelectItem>
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
            {t("clearFilters")}
          </Button>
        )}
      </div>

      {/* Results Count */}
      {filteredEnabledPosters.length !== enabledPosters.length && (
        <div className="text-sm text-muted-foreground">
          {t("showingOf", { count: filteredEnabledPosters.length, total: enabledPosters.length })}
        </div>
      )}

      {/* Upload Step */}
      {showUploader && (
        <PosterUploader
          onUpload={handleUploadComplete}
          onCancel={() => setShowUploader(false)}
        />
      )}

      {/* Active Posters Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{t("activePosters")}</h3>
          <Badge variant="default">{filteredEnabledPosters.length}</Badge>
        </div>

        {filteredEnabledPosters.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {enabledPosters.length === 0
                ? t("noActivePosters")
                : t("noMatchFilters")}
            </p>
            <p className="text-sm text-muted-foreground">
              {enabledPosters.length === 0
                ? t("addOrEnable")
                : t("adjustFilters")}
            </p>
          </div>
        ) : (
          <VirtualizedPosterGrid
            posters={filteredEnabledPosters}
            variant="enabled"
            onToggleEnabled={handleToggleEnabled}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
            isBulkDeleting={isBulkDeleting}
          />
        )}
      </div>

      {/* Disabled Posters Section (Collapsible) */}
      <CollapsibleSection title={t("disabledPosters")} count={disabledPosters.length}>
        <VirtualizedPosterGrid
          posters={disabledPosters}
          variant="disabled"
          onToggleEnabled={handleToggleEnabled}
          onDelete={handleDelete}
          selectedIds={selectedIds}
          onToggleSelection={handleToggleSelection}
          isBulkDeleting={isBulkDeleting}
        />
      </CollapsibleSection>

      {/* Bulk Action Toolbar - appears when items selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                        bg-background border rounded-lg shadow-lg p-4
                        flex items-center gap-4 min-w-[400px]">
          <div className="flex-1">
            <p className="font-medium">
              {t("postersSelected", { count: selectedIds.size })}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleClearSelection}
            disabled={isBulkDeleting}
          >
            {t("clear")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
          >
            {isBulkDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("deleting")}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {tCommon("delete")}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
