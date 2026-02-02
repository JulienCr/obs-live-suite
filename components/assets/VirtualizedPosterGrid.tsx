"use client";

import { PosterCard } from "./PosterCard";
import { VirtualizedGrid } from "@/components/shared/VirtualizedGrid";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: "image" | "video" | "youtube";
  tags: string[];
  isEnabled?: boolean;
  createdAt?: string;
  startTime?: number | null;
  endTime?: number | null;
  thumbnailUrl?: string | null;
}

interface VirtualizedPosterGridProps {
  posters: Poster[];
  variant?: "enabled" | "disabled";
  onEdit?: (poster: Poster) => void;
  onToggleEnabled?: (poster: Poster) => void;
  onDelete?: (poster: Poster) => void;
  onChapters?: (poster: Poster) => void;
  onSubVideos?: (poster: Poster) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  isBulkDeleting?: boolean;
  estimatedItemHeight?: number;
  className?: string;
}

const POSTER_EMPTY_MESSAGES = {
  enabled: "No active posters",
  disabled: "No disabled posters",
};

/**
 * Virtualized grid for displaying hundreds of posters efficiently.
 * Delegates to VirtualizedGrid with PosterCard rendering.
 */
export function VirtualizedPosterGrid({
  posters,
  variant = "enabled",
  onEdit,
  onToggleEnabled,
  onDelete,
  onChapters,
  onSubVideos,
  selectedIds,
  onToggleSelection,
  isBulkDeleting,
  estimatedItemHeight = 280,
  className = "",
}: VirtualizedPosterGridProps): React.ReactElement {
  return (
    <VirtualizedGrid
      items={posters}
      keyExtractor={(poster) => poster.id}
      renderItem={(poster) => (
        <PosterCard
          poster={poster}
          variant={variant}
          onEdit={onEdit}
          onToggleEnabled={onToggleEnabled}
          onDelete={onDelete}
          onChapters={onChapters}
          onSubVideos={onSubVideos}
          isSelected={selectedIds?.has(poster.id)}
          onToggleSelection={onToggleSelection}
          isBulkDeleting={isBulkDeleting}
          showSelectionCheckbox={selectedIds !== undefined}
        />
      )}
      variant={variant}
      emptyMessage={POSTER_EMPTY_MESSAGES}
      estimatedItemHeight={estimatedItemHeight}
      overscan={2}
      className={className}
    />
  );
}
