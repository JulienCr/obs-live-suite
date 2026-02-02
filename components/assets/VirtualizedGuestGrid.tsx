"use client";

import { GuestCard } from "./GuestCard";
import { VirtualizedGrid } from "@/components/shared/VirtualizedGrid";
import type { Guest } from "@/lib/queries";

interface VirtualizedGuestGridProps {
  guests: Guest[];
  variant?: "enabled" | "disabled";
  onQuickLowerThird?: (guest: Guest) => void;
  onEdit?: (guest: Guest) => void;
  onToggleEnabled?: (guest: Guest) => void;
  onDelete?: (guest: Guest) => void;
  estimatedItemHeight?: number;
  className?: string;
}

const GUEST_EMPTY_MESSAGES = {
  enabled: "No active guests",
  disabled: "No disabled guests",
};

/**
 * Virtualized grid for displaying hundreds of guests efficiently.
 * Delegates to VirtualizedGrid with GuestCard rendering.
 */
export function VirtualizedGuestGrid({
  guests,
  variant = "enabled",
  onQuickLowerThird,
  onEdit,
  onToggleEnabled,
  onDelete,
  estimatedItemHeight = 200,
  className = "",
}: VirtualizedGuestGridProps): React.ReactElement {
  return (
    <VirtualizedGrid
      items={guests}
      keyExtractor={(guest) => guest.id}
      renderItem={(guest) => (
        <GuestCard
          guest={guest}
          variant={variant}
          onQuickLowerThird={onQuickLowerThird}
          onEdit={onEdit}
          onToggleEnabled={onToggleEnabled}
          onDelete={onDelete}
        />
      )}
      variant={variant}
      emptyMessage={GUEST_EMPTY_MESSAGES}
      estimatedItemHeight={estimatedItemHeight}
      className={className}
    />
  );
}
