"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useDockview } from "./DockviewContext";
import { useWorkspacesStore } from "@/lib/stores";
import { WorkspaceSaveDialog } from "./WorkspaceSaveDialog";
import { WorkspaceManagerDialog } from "./WorkspaceManagerDialog";

import { getCommandPalettePanels, getPanelParams, getCommandPaletteI18nKey } from "@/lib/panels/registry";

interface Command {
  id: string;
  label: string;
  keywords?: string[];
  action: () => void;
}

export function CommandPalette(): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const { api } = useDockview();
  const t = useTranslations("dashboard.commandPalette");

  const workspacesWorkspaces = useWorkspacesStore((s) => s.workspaces);
  const workspacesResetToDefault = useWorkspacesStore((s) => s.resetToDefault);
  const workspacesApplyWorkspace = useWorkspacesStore((s) => s.applyWorkspace);

  const addPanel = useCallback(
    (id: string, component: string, titleKey: string): void => {
      if (!api) return;

      const existingPanel = api.getPanel(id);
      if (existingPanel) {
        existingPanel.api.setActive();
        return;
      }

      api.addPanel({ id, component, title: `panels.${titleKey}`, params: getPanelParams(id as import("@/lib/panels/registry").PanelId) });
    },
    [api]
  );

  const COMMANDS: Command[] = useMemo(
    () => [
      {
        id: "nav-dashboard",
        label: t("goToDashboard"),
        keywords: ["navigate", "home", "main"],
        action: () => (window.location.href = "/dashboard"),
      },
      {
        id: "nav-assets",
        label: t("goToAssets"),
        keywords: ["navigate", "assets", "images", "media", "upload"],
        action: () => (window.location.href = "/assets"),
      },
      {
        id: "nav-settings",
        label: t("goToSettings"),
        keywords: ["navigate", "preferences", "config", "configure"],
        action: () => (window.location.href = "/settings"),
      },
      {
        id: "nav-profiles",
        label: t("goToProfiles"),
        keywords: ["navigate", "profiles", "guests", "people"],
        action: () => (window.location.href = "/profiles"),
      },
      {
        id: "nav-quiz-manage",
        label: t("goToQuizManagement"),
        keywords: ["navigate", "quiz", "questions", "manage"],
        action: () => (window.location.href = "/quiz/manage"),
      },
      {
        id: "nav-quiz-host",
        label: t("goToQuizHost"),
        keywords: ["navigate", "quiz", "host", "control"],
        action: () => (window.location.href = "/quiz/host"),
      },
      ...getCommandPalettePanels().map((p) => ({
        id: `panel-${p.id}`,
        label: t(getCommandPaletteI18nKey(p.id)),
        keywords: p.keywords,
        action: () => addPanel(p.id, p.id, p.id),
      })),
      {
        id: "reset-layout",
        label: t("resetLayout"),
        keywords: ["layout", "reset", "default", "restore"],
        action: () => {
          if (api) {
            localStorage.removeItem("obs-live-suite-dockview-layout");
            window.location.reload();
          }
        },
      },
    ],
    [t, api, addPanel]
  );

  const workspaceCommands: Command[] = useMemo(() => {
    const commands: Command[] = [
      {
        id: "workspace-reset",
        label: t("resetWorkspace"),
        keywords: ["workspace", "reset", "default", "restore"],
        action: () => workspacesResetToDefault().catch(console.error),
      },
      {
        id: "workspace-save",
        label: t("saveWorkspace"),
        keywords: ["workspace", "save", "layout", "create"],
        action: () => setSaveDialogOpen(true),
      },
      {
        id: "workspace-manage",
        label: t("manageWorkspaces"),
        keywords: ["workspace", "manage", "edit", "delete", "rename"],
        action: () => setManagerDialogOpen(true),
      },
    ];

    for (const workspace of workspacesWorkspaces) {
      commands.push({
        id: `workspace-switch-${workspace.id}`,
        label: t("switchToWorkspace", { name: workspace.name }),
        keywords: ["workspace", "switch", "change", workspace.name.toLowerCase()],
        action: () => workspacesApplyWorkspace(workspace.id).catch(console.error),
      });
    }

    return commands;
  }, [workspacesWorkspaces, workspacesResetToDefault, workspacesApplyWorkspace, t]);

  const allCommands = useMemo(
    () => [...COMMANDS, ...workspaceCommands],
    [COMMANDS, workspaceCommands]
  );

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      const hasModifier = e.metaKey || e.ctrlKey;
      if (hasModifier && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function handleSelect(commandId: string): void {
    setIsOpen(false);
    const command = allCommands.find((c) => c.id === commandId);
    command?.action();
  }

  return (
    <>
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput placeholder={t("placeholder")} />
        <CommandList>
          <CommandEmpty>{t("noResults")}</CommandEmpty>
          <CommandGroup>
            {allCommands.map((command) => (
              <CommandItem
                key={command.id}
                value={[command.label, ...(command.keywords ?? [])].join(" ")}
                onSelect={() => handleSelect(command.id)}
              >
                {command.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <WorkspaceSaveDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} />
      <WorkspaceManagerDialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen} />
    </>
  );
}
