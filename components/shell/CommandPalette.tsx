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
  {
    id: "toggle-explorer",
    label: "Toggle Explorer Panel",
    keywords: ["panel", "sidebar", "explorer"],
    action: () => console.log("Toggle Explorer"),
  },
  {
    id: "toggle-console",
    label: "Toggle Console",
    keywords: ["panel", "console", "log"],
    action: () => console.log("Toggle Console"),
  },
  {
    id: "settings",
    label: "Open Settings",
    keywords: ["preferences", "config"],
    action: () => (window.location.href = "/settings"),
  },
  {
    id: "assets",
    label: "Open Assets",
    keywords: ["assets", "images", "media"],
    action: () => (window.location.href = "/assets"),
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
      placeholder="Type a command or search... (Cmd/Ctrl+P)"
    />
  );
}
