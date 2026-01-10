"use client";

import { Star, Check, Lock, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DbWorkspaceSummary } from "@/lib/models/Database";

export interface WorkspaceListItemProps {
  workspace: DbWorkspaceSummary;
  isCurrent: boolean;
  isModified?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * Compact workspace list item for dropdown menus - displays workspace name with star/check icons.
 * For full variant with edit capabilities, use WorkspaceListItemFull instead.
 */
export function WorkspaceListItem({
  workspace,
  isCurrent,
  isModified = false,
  disabled = false,
  onClick,
}: WorkspaceListItemProps) {
  return (
    <div
      className="flex items-center justify-between w-full"
      onClick={disabled ? undefined : onClick}
    >
      <div className="flex items-center gap-2">
        {workspace.isDefault && (
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
        )}
        <span>{workspace.name}</span>
      </div>
      {isCurrent && !isModified && <Check className="w-4 h-4" />}
    </div>
  );
}

export interface WorkspaceListItemFullProps {
  workspace: DbWorkspaceSummary;
  isCurrent: boolean;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  onClick: () => void;
  translations: {
    isDefault: string;
    setAsDefault: string;
    rename: string;
    confirmRename: string;
    cancelRename: string;
    delete: string;
  };
}

/**
 * Full variant for dialog/list views - displays workspace card with edit capabilities
 */
export function WorkspaceListItemFull({
  workspace,
  isCurrent,
  isEditing,
  editingName,
  onEditingNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onSetDefault,
  onDelete,
  onClick,
  translations,
}: WorkspaceListItemFullProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border transition-colors",
        isCurrent && "border-primary bg-primary/5",
        !isCurrent && "border-border hover:bg-accent/50 cursor-pointer"
      )}
      onClick={() => !isEditing && !workspace.isBuiltIn && onClick()}
    >
      {/* Default Star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSetDefault();
        }}
        className="p-1 hover:bg-accent rounded"
        title={workspace.isDefault ? translations.isDefault : translations.setAsDefault}
      >
        <Star
          className={cn(
            "w-4 h-4",
            workspace.isDefault
              ? "text-yellow-500 fill-yellow-500"
              : "text-muted-foreground"
          )}
        />
      </button>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            className="h-8"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{workspace.name}</span>
            {workspace.isBuiltIn && (
              <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
          </div>
        )}
        {workspace.description && !isEditing && (
          <p className="text-xs text-muted-foreground truncate">
            {workspace.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onSaveEdit();
              }}
              aria-label={translations.confirmRename}
              title={translations.confirmRename}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onCancelEdit();
              }}
              aria-label={translations.cancelRename}
              title={translations.cancelRename}
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            {!workspace.isBuiltIn && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartEdit();
                  }}
                  title={translations.rename}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  title={translations.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
