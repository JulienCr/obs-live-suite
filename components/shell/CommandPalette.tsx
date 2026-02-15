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
  const tPanels = useTranslations("dashboard.panels");

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

      api.addPanel({ id, component, title: tPanels(titleKey) });
    },
    [api, tPanels]
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
      {
        id: "panel-lower-third",
        label: t("showLowerThirdPanel"),
        keywords: ["panel", "widget", "lower", "third", "overlay", "add"],
        action: () => addPanel("lowerThird", "lowerThird", "lowerThird"),
      },
      {
        id: "panel-countdown",
        label: t("showCountdownPanel"),
        keywords: ["panel", "widget", "countdown", "timer", "add"],
        action: () => addPanel("countdown", "countdown", "countdown"),
      },
      {
        id: "panel-guests",
        label: t("showGuestsPanel"),
        keywords: ["panel", "widget", "guests", "people", "add"],
        action: () => addPanel("guests", "guests", "guests"),
      },
      {
        id: "panel-poster",
        label: t("showPosterPanel"),
        keywords: ["panel", "widget", "poster", "gallery", "add"],
        action: () => addPanel("poster", "poster", "poster"),
      },
      {
        id: "panel-macros",
        label: t("showMacrosPanel"),
        keywords: ["panel", "widget", "macros", "shortcuts", "add"],
        action: () => addPanel("macros", "macros", "macros"),
      },
      {
        id: "panel-event-log",
        label: t("showEventLogPanel"),
        keywords: ["panel", "widget", "event", "log", "history", "add"],
        action: () => addPanel("eventLog", "eventLog", "eventLog"),
      },
      {
        id: "panel-text-presets",
        label: t("showTextPresetsPanel"),
        keywords: ["panel", "widget", "text", "presets", "lower", "third", "quick", "add"],
        action: () => addPanel("textPresets", "textPresets", "textPresets"),
      },
      {
        id: "panel-twitch",
        label: t("showTwitchPanel"),
        keywords: [
          "panel", "widget", "twitch", "stats", "viewers", "broadcast",
          "stream", "control", "title", "category", "edit", "add",
        ],
        action: () => addPanel("twitch", "twitch", "twitch"),
      },
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
      if (hasModifier && e.key.toLowerCase() === "p") {
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
