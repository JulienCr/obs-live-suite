"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Type,
  Timer,
  Users,
  Image,
  Command,
  FileText,
  BookText,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  MessagesSquare,
  Inbox,
  Radio,
  Send,
} from "lucide-react";
import { useDockview } from "./DockviewContext";

interface PanelItem {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  component: string;
}

const PANELS: PanelItem[] = [
  { id: "lowerThird", labelKey: "lowerThird", icon: Type, component: "lowerThird" },
  { id: "countdown", labelKey: "countdown", icon: Timer, component: "countdown" },
  { id: "guests", labelKey: "guests", icon: Users, component: "guests" },
  { id: "textPresets", labelKey: "textPresets", icon: BookText, component: "textPresets" },
  { id: "poster", labelKey: "poster", icon: Image, component: "poster" },
  { id: "macros", labelKey: "macros", icon: Command, component: "macros" },
  { id: "eventLog", labelKey: "eventLog", icon: FileText, component: "eventLog" },
  { id: "regieInternalChat", labelKey: "regieInternalChat", icon: MessageSquare, component: "regieInternalChat" },
  { id: "regieInternalChatView", labelKey: "regieInternalChatView", icon: Inbox, component: "regieInternalChatView" },
  { id: "regiePublicChat", labelKey: "regiePublicChat", icon: MessagesSquare, component: "regiePublicChat" },
  { id: "twitch", labelKey: "twitch", icon: Radio, component: "twitch" },
  { id: "chatMessages", labelKey: "chatMessages", icon: Send, component: "chatMessages" },
];

const RAIL_WIDTH_COLLAPSED = 48;
const RAIL_WIDTH_EXPANDED = 200;

export function LiveModeRail() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { api, savePositionBeforeClose, getSavedPosition } = useDockview();
  const t = useTranslations("dashboard.panels");

  const handlePanelToggle = (panelId: string, component: string, labelKey: string) => {
    if (!api) return;

    const panel = api.getPanel(panelId);

    if (panel) {
      // Save position before closing
      savePositionBeforeClose(panelId);
      panel.api.close();
    } else {
      // Try to restore to saved position
      const saved = getSavedPosition(panelId);
      let position: Parameters<typeof api.addPanel>[0]["position"];

      if (saved?.siblingPanelId) {
        // Restore as tab next to sibling
        const sibling = api.getPanel(saved.siblingPanelId);
        if (sibling) {
          position = {
            referencePanel: saved.siblingPanelId,
            direction: "within",
            index: saved.tabIndex,
          };
        }
      } else if (saved?.neighborPanelId) {
        // Restore next to neighbor
        const neighbor = api.getPanel(saved.neighborPanelId);
        if (neighbor) {
          position = {
            referencePanel: saved.neighborPanelId,
            direction: saved.direction || "right",
          };
        }
      }

      api.addPanel({
        id: panelId,
        component,
        title: t(labelKey),
        position,
      });
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
          const label = t(panel.labelKey);

          return (
            <button
              key={panel.id}
              onClick={() => handlePanelToggle(panel.id, panel.component, panel.labelKey)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 transition-colors relative",
                isVisible
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              title={isExpanded ? undefined : label}
            >
              {isVisible && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              {isExpanded && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
