"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Play, Layers, Image, Palette, FolderOpen, Users, Settings as SettingsIcon, Plug, Download, HelpCircle, Database, FolderCog, FileStack, Shield, Package, Sparkles, MessageSquare } from "lucide-react";

interface NavSection {
  id: string;
  labelKey: string;
  items: NavItem[];
}

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

const navigationSections: NavSection[] = [
  {
    id: "live",
    labelKey: "live",
    items: [
      { labelKey: "showControl", href: "/dashboard", icon: Play },
      { labelKey: "overlays", href: "/settings/overlays", icon: Layers },
    ],
  },
  {
    id: "library",
    labelKey: "library",
    items: [
      { labelKey: "posters", href: "/assets/posters", icon: Image },
      { labelKey: "themes", href: "/assets/themes", icon: Palette },
    ],
  },
  {
    id: "show-setup",
    labelKey: "showSetup",
    items: [
      { labelKey: "profiles", href: "/profiles", icon: FolderOpen },
      { labelKey: "guests", href: "/assets/guests", icon: Users },
    ],
  },
  {
    id: "presenter",
    labelKey: "presenter",
    items: [
      { labelKey: "rooms", href: "/settings/presenter/rooms", icon: MessageSquare },
    ],
  },
  {
    id: "integrations",
    labelKey: "integrations",
    items: [
      { labelKey: "obs", href: "/settings/obs", icon: Plug },
      { labelKey: "streamDeck", href: "/integrations/stream-deck", icon: Shield },
      { labelKey: "pluginsUpdates", href: "/updater", icon: Download },
    ],
  },
  {
    id: "settings",
    labelKey: "settings",
    items: [
      { labelKey: "general", href: "/settings/general", icon: SettingsIcon },
      { labelKey: "integrationsSettings", href: "/settings/integrations", icon: Sparkles },
      { labelKey: "backend", href: "/settings/backend", icon: Database },
      { labelKey: "paths", href: "/settings/paths", icon: FolderCog },
      { labelKey: "backup", href: "/settings/backup", icon: FileStack },
      { labelKey: "plugins", href: "/settings/plugins", icon: Package },
    ],
  },
];

const COLLAPSED_SECTIONS_KEY = "obs-live-suite-collapsed-sections";

export function AdminSidebar() {
  const pathname = usePathname();
  const tSections = useTranslations("navigation.sections");
  const tItems = useTranslations("navigation.items");
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
                  <span>{tSections(section.labelKey)}</span>
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
                          <span>{tItems(item.labelKey)}</span>
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
          <span>{tItems("helpSupport")}</span>
        </Link>
      </div>
    </aside>
  );
}
