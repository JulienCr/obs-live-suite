"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspaces } from "./WorkspacesContext";
import {
  Star,
  Trash2,
  Pencil,
  Check,
  X,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiPut } from "@/lib/utils/ClientFetch";

interface WorkspaceManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceManagerDialog({
  open,
  onOpenChange,
}: WorkspaceManagerDialogProps) {
  const t = useTranslations("dashboard.workspaces");
  const {
    workspaces,
    currentWorkspaceId,
    setAsDefault,
    deleteWorkspace,
    refreshWorkspaces,
    applyWorkspace,
  } = useWorkspaces();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const builtInWorkspaces = workspaces.filter((w) => w.isBuiltIn);
  const userWorkspaces = workspaces.filter((w) => !w.isBuiltIn);

  const workspaceToDelete = workspaces.find((w) => w.id === deleteConfirmId);

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      await apiPut(`/api/workspaces/${editingId}`, {
        name: editingName.trim(),
      });
      await refreshWorkspaces();
      handleCancelEdit();
    } catch (error) {
      console.error("Failed to rename workspace:", error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setAsDefault(id);
    } catch (error) {
      console.error("Failed to set default:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    setIsDeleting(true);
    try {
      await deleteWorkspace(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleWorkspaceClick = async (id: string) => {
    if (editingId) return; // Don't switch while editing
    try {
      await applyWorkspace(id);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to apply workspace:", error);
    }
  };

  const renderWorkspaceItem = (workspace: typeof workspaces[0]) => {
    const isEditing = editingId === workspace.id;
    const isCurrent = currentWorkspaceId === workspace.id;

    return (
      <div
        key={workspace.id}
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg border transition-colors",
          isCurrent && "border-primary bg-primary/5",
          !isCurrent && "border-border hover:bg-accent/50 cursor-pointer"
        )}
        onClick={() => !isEditing && !workspace.isBuiltIn && handleWorkspaceClick(workspace.id)}
      >
        {/* Default Star */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSetDefault(workspace.id);
          }}
          className="p-1 hover:bg-accent rounded"
          title={workspace.isDefault ? t("manager.isDefault") : t("manager.setAsDefault")}
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
              onChange={(e) => setEditingName(e.target.value)}
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") handleCancelEdit();
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
                  handleSaveEdit();
                }}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
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
                      handleStartEdit(workspace.id, workspace.name);
                    }}
                    title={t("manager.rename")}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(workspace.id);
                    }}
                    title={t("manager.delete")}
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
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("manager.title")}</DialogTitle>
            <DialogDescription>{t("manager.description")}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Built-in Workspaces */}
            {builtInWorkspaces.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("builtIn")}
                </h3>
                <div className="space-y-2">
                  {builtInWorkspaces.map(renderWorkspaceItem)}
                </div>
              </div>
            )}

            {/* User Workspaces */}
            {userWorkspaces.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("myWorkspaces")}
                </h3>
                <div className="space-y-2">
                  {userWorkspaces.map(renderWorkspaceItem)}
                </div>
              </div>
            )}

            {/* Empty State */}
            {userWorkspaces.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("manager.noUserWorkspaces")}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("manager.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("manager.deleteConfirm.description", {
                name: workspaceToDelete?.name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("manager.deleteConfirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("manager.deleteConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
