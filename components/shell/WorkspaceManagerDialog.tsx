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
import type { DbWorkspaceSummary } from "@/lib/models/Database";
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
import { useWorkspacesStore } from "@/lib/stores";
import { apiPut } from "@/lib/utils/ClientFetch";
import { WorkspaceListItemFull } from "./WorkspaceListItem";

interface WorkspaceManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceManagerDialog({
  open,
  onOpenChange,
}: WorkspaceManagerDialogProps) {
  const t = useTranslations("dashboard.workspaces");
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const currentWorkspaceId = useWorkspacesStore((s) => s.currentWorkspaceId);
  const setAsDefault = useWorkspacesStore((s) => s.setAsDefault);
  const deleteWorkspace = useWorkspacesStore((s) => s.deleteWorkspace);
  const refreshWorkspaces = useWorkspacesStore((s) => s.refreshWorkspaces);
  const applyWorkspace = useWorkspacesStore((s) => s.applyWorkspace);

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

  const translations = {
    isDefault: t("manager.isDefault"),
    setAsDefault: t("manager.setAsDefault"),
    rename: t("manager.rename"),
    confirmRename: t("manager.confirmRename"),
    cancelRename: t("manager.cancelRename"),
    delete: t("manager.delete"),
  };

  const renderWorkspaceItem = (workspace: DbWorkspaceSummary) => (
    <WorkspaceListItemFull
      key={workspace.id}
      workspace={workspace}
      isCurrent={currentWorkspaceId === workspace.id}
      isEditing={editingId === workspace.id}
      editingName={editingName}
      onEditingNameChange={setEditingName}
      onStartEdit={() => handleStartEdit(workspace.id, workspace.name)}
      onSaveEdit={handleSaveEdit}
      onCancelEdit={handleCancelEdit}
      onSetDefault={() => handleSetDefault(workspace.id)}
      onDelete={() => setDeleteConfirmId(workspace.id)}
      onClick={() => handleWorkspaceClick(workspace.id)}
      translations={translations}
    />
  );

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
