"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Play, Layers, Image, Palette, FolderOpen, Users, Settings as SettingsIcon, Plug, Download, HelpCircle, Database, FolderCog, FileStack, Shield, Package, Sparkles, MessageSquare } from "lucide-react";

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navigationSections: NavSection[] = [
  {
    id: "live",
    label: "LIVE",
    items: [
      { label: "Show Control", href: "/dashboard", icon: Play },
      { label: "Overlays", href: "/settings/overlays", icon: Layers },
    ],
  },
  {
    id: "library",
    label: "LIBRARY",
    items: [
      { label: "Posters", href: "/assets/posters", icon: Image },
      { label: "Themes", href: "/assets/themes", icon: Palette },
    ],
  },
  {
    id: "show-setup",
    label: "SHOW SETUP",
    items: [
      { label: "Profiles", href: "/profiles", icon: FolderOpen },
      { label: "Guests", href: "/assets/guests", icon: Users },
    ],
  },
  {
    id: "presenter",
    label: "PRESENTER",
    items: [
      { label: "Rooms", href: "/settings/presenter/rooms", icon: MessageSquare },
    ],
  },
  {
    id: "integrations",
    label: "INTEGRATIONS",
    items: [
      { label: "OBS", href: "/settings/obs", icon: Plug },
      { label: "Stream Deck", href: "/integrations/stream-deck", icon: Shield },
      { label: "Plugins & Updates", href: "/updater", icon: Download },
    ],
  },
  {
    id: "settings",
    label: "SETTINGS",
    items: [
      { label: "General", href: "/settings/general", icon: SettingsIcon },
      { label: "Integrations", href: "/settings/integrations", icon: Sparkles },
      { label: "Backend", href: "/settings/backend", icon: Database },
      { label: "Paths", href: "/settings/paths", icon: FolderCog },
      { label: "Backup", href: "/settings/backup", icon: FileStack },
      { label: "Plugins", href: "/settings/plugins", icon: Package },
    ],
  },
];

const COLLAPSED_SECTIONS_KEY = "obs-live-suite-collapsed-sections";

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCollapsedSections(new Set(parsed));
      } catch (error) {
        console.error("Failed to parse collapsed sections:", error);
      }
    }
  }, []);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-60 border-r bg-card flex flex-col">
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {navigationSections.map((section) => {
            const isCollapsed = collapsedSections.has(section.id);

            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full text-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <span>{section.label}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                            active
                              ? "bg-accent text-accent-foreground border-l-2 border-primary"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t p-4">
        <Link
          href="/help"
          className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground rounded-md transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help & Support</span>
        </Link>
      </div>
    </aside>
  );
}
