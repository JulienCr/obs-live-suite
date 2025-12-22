"use client";

import { useState, useEffect } from "react";
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

  // Function to add panel if not already open
  const addPanel = (id: string, component: string, title: string) => {
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
      title,
    });
  };

  const COMMANDS: Command[] = [
    // Navigation
    {
      id: "nav-dashboard",
      label: "Go to Dashboard",
      keywords: ["navigate", "home", "main"],
      action: () => (window.location.href = "/dashboard"),
    },
    {
      id: "nav-assets",
      label: "Go to Assets",
      keywords: ["navigate", "assets", "images", "media", "upload"],
      action: () => (window.location.href = "/assets"),
    },
    {
      id: "nav-settings",
      label: "Go to Settings",
      keywords: ["navigate", "preferences", "config", "configure"],
      action: () => (window.location.href = "/settings"),
    },
    {
      id: "nav-profiles",
      label: "Go to Profiles",
      keywords: ["navigate", "profiles", "guests", "people"],
      action: () => (window.location.href = "/profiles"),
    },
    {
      id: "nav-quiz-manage",
      label: "Go to Quiz Management",
      keywords: ["navigate", "quiz", "questions", "manage"],
      action: () => (window.location.href = "/quiz/manage"),
    },
    {
      id: "nav-quiz-host",
      label: "Go to Quiz Host",
      keywords: ["navigate", "quiz", "host", "control"],
      action: () => (window.location.href = "/quiz/host"),
    },
    // Panel management
    {
      id: "panel-lower-third",
      label: "Show Lower Third Panel",
      keywords: ["panel", "widget", "lower", "third", "overlay", "add"],
      action: () => addPanel("lowerThird", "lowerThird", "Lower Third"),
    },
    {
      id: "panel-countdown",
      label: "Show Countdown Panel",
      keywords: ["panel", "widget", "countdown", "timer", "add"],
      action: () => addPanel("countdown", "countdown", "Countdown"),
    },
    {
      id: "panel-guests",
      label: "Show Guests Panel",
      keywords: ["panel", "widget", "guests", "people", "add"],
      action: () => addPanel("guests", "guests", "Guests"),
    },
    {
      id: "panel-poster",
      label: "Show Poster Panel",
      keywords: ["panel", "widget", "poster", "gallery", "add"],
      action: () => addPanel("poster", "poster", "Poster"),
    },
    {
      id: "panel-macros",
      label: "Show Macros Panel",
      keywords: ["panel", "widget", "macros", "shortcuts", "add"],
      action: () => addPanel("macros", "macros", "Macros"),
    },
    {
      id: "panel-event-log",
      label: "Show Event Log Panel",
      keywords: ["panel", "widget", "event", "log", "history", "add"],
      action: () => addPanel("eventLog", "eventLog", "Event Log"),
    },
    // Layout management
    {
      id: "reset-layout",
      label: "Reset Layout to Default",
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
      inputProps={{ placeholder: "Type a command or search... (Cmd/Ctrl+P)" }}
    />
  );
}
