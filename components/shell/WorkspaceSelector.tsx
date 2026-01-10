"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Check,
  Save,
  RotateCcw,
  Settings2,
  Layout,
  Star,
} from "lucide-react";
import { useWorkspacesSafe } from "./WorkspacesContext";
import { WorkspaceSaveDialog } from "./WorkspaceSaveDialog";
import { WorkspaceManagerDialog } from "./WorkspaceManagerDialog";

export function WorkspaceSelector() {
  const t = useTranslations("dashboard.workspaces");
  const workspacesContext = useWorkspacesSafe();

  // If we're outside the WorkspacesProvider, don't render anything
  if (!workspacesContext) {
    return null;
  }

  const {
    workspaces,
    currentWorkspaceId,
    isModified,
    isLoading,
    isReady,
    applyWorkspace,
    resetToDefault,
  } = workspacesContext;

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  const builtInWorkspaces = workspaces.filter((w) => w.isBuiltIn);
  const userWorkspaces = workspaces.filter((w) => !w.isBuiltIn);

  function getDisplayName(): string {
    if (currentWorkspace) {
      return isModified ? `${currentWorkspace.name} *` : currentWorkspace.name;
    }
    return isModified ? t("custom") : t("noWorkspace");
  }
  const displayName = getDisplayName();

  const handleWorkspaceSelect = async (id: string) => {
    if (!canApplyLayout) return;
    try {
      await applyWorkspace(id);
    } catch (error) {
      console.error("Failed to apply workspace:", error);
    }
  };

  const handleResetToDefault = async () => {
    if (!canApplyLayout) return;
    try {
      await resetToDefault();
    } catch (error) {
      console.error("Failed to reset to default:", error);
    }
  };

  // Don't show selector if workspaces haven't loaded yet
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" className="h-9 gap-2 text-sm" disabled>
        <Layout className="w-4 h-4" />
        {t("loading")}
      </Button>
    );
  }

  // If not on dashboard (isReady false), still show selector but disable layout actions
  const canApplyLayout = isReady;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-sm max-w-[200px]"
          >
            <Layout className="w-4 h-4 shrink-0" />
            <span className="truncate">{displayName}</span>
            <ChevronDown className="w-3 h-3 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* Built-in Workspaces */}
          {builtInWorkspaces.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("builtIn")}
              </DropdownMenuLabel>
              {builtInWorkspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => handleWorkspaceSelect(workspace.id)}
                  className="flex items-center justify-between"
                  disabled={!canApplyLayout}
                >
                  <div className="flex items-center gap-2">
                    {workspace.isDefault && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    )}
                    <span>{workspace.name}</span>
                  </div>
                  {currentWorkspaceId === workspace.id && !isModified && (
                    <Check className="w-4 h-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          {/* User Workspaces */}
          {userWorkspaces.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("myWorkspaces")}
              </DropdownMenuLabel>
              {userWorkspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => handleWorkspaceSelect(workspace.id)}
                  className="flex items-center justify-between"
                  disabled={!canApplyLayout}
                >
                  <div className="flex items-center gap-2">
                    {workspace.isDefault && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    )}
                    <span>{workspace.name}</span>
                  </div>
                  {currentWorkspaceId === workspace.id && !isModified && (
                    <Check className="w-4 h-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          {/* Actions */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)} disabled={!canApplyLayout}>
            <Save className="w-4 h-4 mr-2" />
            {t("save")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleResetToDefault} disabled={!canApplyLayout}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {t("reset")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setManagerDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" />
            {t("manage")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WorkspaceSaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
      />

      <WorkspaceManagerDialog
        open={managerDialogOpen}
        onOpenChange={setManagerDialogOpen}
      />
    </>
  );
}
