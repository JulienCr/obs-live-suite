"use client";

import { useState, useEffect, useMemo } from "react";
import { Omnibar, type ItemRenderer } from "@blueprintjs/select";
import { MenuItem } from "@blueprintjs/core";

interface Command {
  id: string;
  label: string;
  keywords?: string[];
  action: () => void;
}

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
];

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
