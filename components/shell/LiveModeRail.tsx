"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Type,
  Timer,
  Users,
  Image,
  Command,
  FileText,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  MessagesSquare,
  Inbox,
} from "lucide-react";
import { useDockview } from "./DockviewContext";

interface PanelItem {
  id: string;
  label: string;
  icon: React.ElementType;
  component: string;
}

const PANELS: PanelItem[] = [
  { id: "lowerThird", label: "Lower Third", icon: Type, component: "lowerThird" },
  { id: "countdown", label: "Countdown", icon: Timer, component: "countdown" },
  { id: "guests", label: "Guests", icon: Users, component: "guests" },
  { id: "poster", label: "Poster", icon: Image, component: "poster" },
  { id: "macros", label: "Macros", icon: Command, component: "macros" },
  { id: "eventLog", label: "Event Log", icon: FileText, component: "eventLog" },
  { id: "regieInternalChat", label: "Send Message", icon: MessageSquare, component: "regieInternalChat" },
  { id: "regieInternalChatView", label: "Chat View", icon: Inbox, component: "regieInternalChatView" },
  { id: "regiePublicChat", label: "Public Chat", icon: MessagesSquare, component: "regiePublicChat" },
];

const RAIL_WIDTH_COLLAPSED = 48;
const RAIL_WIDTH_EXPANDED = 200;

export function LiveModeRail() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { api } = useDockview();

  const handlePanelToggle = (panelId: string, component: string, label: string) => {
    if (!api) {
      console.log("API not available yet");
      return;
    }

    // Check if panel exists
    const panel = api.getPanel(panelId);

    if (panel) {
      // Panel exists - focus it
      console.log(`Focusing existing panel: ${panelId}`);
      panel.api.setActive();
    } else {
      // Panel doesn't exist - add it
      console.log(`Adding new panel: ${panelId}`);
      try {
        api.addPanel({
          id: panelId,
          component,
          title: label,
        });
      } catch (error) {
        console.error(`Failed to add panel ${panelId}:`, error);
      }
    }
  };

  const isPanelVisible = (panelId: string) => {
    if (!api) return false;
    return !!api.getPanel(panelId);
  };

  return (
    <aside
      className="relative border-r bg-card transition-all duration-200 flex flex-col"
      style={{ width: isExpanded ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH_COLLAPSED }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Toggle indicator */}
      <div className="h-12 border-b flex items-center justify-center text-muted-foreground">
        {isExpanded ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </div>

      {/* Panel buttons */}
      <nav className="flex-1 py-4">
        {PANELS.map((panel) => {
          const Icon = panel.icon;
          const isVisible = isPanelVisible(panel.id);

          return (
            <button
              key={panel.id}
              onClick={() => handlePanelToggle(panel.id, panel.component, panel.label)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 transition-colors relative",
                isVisible
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              title={isExpanded ? undefined : panel.label}
            >
              {isVisible && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isExpanded && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                  {panel.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
