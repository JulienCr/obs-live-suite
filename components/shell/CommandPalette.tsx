"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Omnibar, type ItemRenderer } from "@blueprintjs/select";
import { MenuItem } from "@blueprintjs/core";
import { useDockview } from "./DockviewContext";

interface Command {
  id: string;
  label: string;
  keywords?: string[];
  action: () => void;
}

const TypedOmnibar = Omnibar.ofType<Command>();

const renderCommand: ItemRenderer<Command> = (
  command,
  { handleClick, handleFocus, modifiers }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <MenuItem
      key={command.id}
      text={command.label}
      active={modifiers.active}
      onClick={handleClick}
      onFocus={handleFocus}
    />
  );
};

const filterCommand = (query: string, command: Command) => {
  const lowerQuery = query.toLowerCase();
  return (
    command.label.toLowerCase().includes(lowerQuery) ||
    command.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery)) ||
    false
  );
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const { api } = useDockview();
  const t = useTranslations("dashboard.commandPalette");
  const tPanels = useTranslations("dashboard.panels");

  // Function to add panel if not already open
  const addPanel = (id: string, component: string, titleKey: string) => {
    if (!api) return;

    // Check if panel already exists
    const existingPanel = api.getPanel(id);
    if (existingPanel) {
      // Focus existing panel
      existingPanel.api.setActive();
      return;
    }

    // Add new panel
    api.addPanel({
      id,
      component,
      title: tPanels(titleKey),
    });
  };

  const COMMANDS: Command[] = [
    // Navigation
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
    // Panel management
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
      id: "panel-twitch",
      label: t("showTwitchPanel"),
      keywords: ["panel", "widget", "twitch", "stats", "viewers", "broadcast", "stream", "control", "title", "category", "edit", "add"],
      action: () => addPanel("twitch", "twitch", "twitch"),
    },
    // Layout management
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
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+P or Ctrl+P
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Cmd+Shift+P or Ctrl+Shift+P (alternative)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleItemSelect = (command: Command) => {
    setIsOpen(false);
    command.action();
  };

  return (
    <TypedOmnibar
      isOpen={isOpen}
      items={COMMANDS}
      itemRenderer={renderCommand}
      itemPredicate={filterCommand}
      onItemSelect={handleItemSelect}
      onClose={() => setIsOpen(false)}
      resetOnSelect
      inputProps={{ placeholder: t("placeholder") }}
    />
  );
}
