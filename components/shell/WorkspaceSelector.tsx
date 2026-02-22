"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Save,
  RotateCcw,
  Settings2,
  Layout,
} from "lucide-react";
import { TopBarSelect } from "./TopBarSelect";
import { useWorkspacesStore } from "@/lib/stores";
import { WorkspaceSaveDialog } from "./WorkspaceSaveDialog";
import { WorkspaceManagerDialog } from "./WorkspaceManagerDialog";
import { WorkspaceListItem } from "./WorkspaceListItem";

export function WorkspaceSelector() {
  const t = useTranslations("dashboard.workspaces");
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const currentWorkspaceId = useWorkspacesStore((s) => s.currentWorkspaceId);
  const isModified = useWorkspacesStore((s) => s.isModified);
  const isLoading = useWorkspacesStore((s) => s.isLoading);
  const isReady = useWorkspacesStore((s) => s.isReady);
  const applyWorkspace = useWorkspacesStore((s) => s.applyWorkspace);
  const resetToDefault = useWorkspacesStore((s) => s.resetToDefault);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  const builtInWorkspaces = workspaces.filter((w) => w.isBuiltIn);
  const userWorkspaces = workspaces.filter((w) => !w.isBuiltIn);

  let displayName: string;
  if (currentWorkspace) {
    displayName = isModified ? `${currentWorkspace.name} *` : currentWorkspace.name;
  } else {
    displayName = isModified ? t("custom") : t("noWorkspace");
  }

  async function handleWorkspaceSelect(id: string): Promise<void> {
    if (!isReady) return;
    try {
      await applyWorkspace(id);
    } catch (error) {
      console.error("Failed to apply workspace:", error);
    }
  }

  async function handleResetToDefault(): Promise<void> {
    if (!isReady) return;
    try {
      await resetToDefault();
    } catch (error) {
      console.error("Failed to reset to default:", error);
    }
  }

  // Don't show selector if workspaces haven't loaded yet
  if (isLoading) {
    return (
      <TopBarSelect
        icon={<Layout className="w-4 h-4 shrink-0" />}
        label={t("loading")}
        disabled
      />
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TopBarSelect
            icon={<Layout className="w-4 h-4 shrink-0" />}
            label={displayName}
          />
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
                  disabled={!isReady}
                >
                  <WorkspaceListItem
                    workspace={workspace}
                    isCurrent={currentWorkspaceId === workspace.id}
                    isModified={isModified}
                  />
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
                  disabled={!isReady}
                >
                  <WorkspaceListItem
                    workspace={workspace}
                    isCurrent={currentWorkspaceId === workspace.id}
                    isModified={isModified}
                  />
                </DropdownMenuItem>
              ))}
            </>
          )}

          {/* Actions */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)} disabled={!isReady}>
            <Save className="w-4 h-4 mr-2" />
            {t("save")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleResetToDefault} disabled={!isReady}>
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
