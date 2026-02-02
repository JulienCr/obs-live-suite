import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EntityHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  stats?: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  children?: React.ReactNode;
}

/**
 * Reusable header component for entity managers (GuestManager, PosterManager, ThemeList, etc.)
 * Provides consistent header layout with icon, title, optional stats, and add button.
 */
export function EntityHeader({
  icon: Icon,
  title,
  stats,
  onAdd,
  addLabel,
  children,
}: EntityHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Icon className="w-6 h-6" />
          {title}
        </h2>
        {stats && (
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted-foreground">{stats}</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onAdd && (
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 mr-2" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
