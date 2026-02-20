"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PanelLeftClose,
  PanelLeft,
  Type,
  Timer,
  Users,
  Image,
  Command,
  FileText,
  BookText,
  MessageSquare,
  MessagesSquare,
  Inbox,
  Radio,
  Send,
  Layers,
  Palette,
  FolderOpen,
  Settings as SettingsIcon,
  Plug,
  Download,
  HelpCircle,
  Database,
  FolderCog,
  FileStack,
  Shield,
  Package,
  Sparkles,
  Twitch,
  Bot,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAppMode } from "@/components/shell/AppModeContext";
import { useOBSStatus, useStreamerbotStatus, useTwitchAuthStatus } from "@/lib/queries";
import { useDockviewStore } from "@/lib/stores";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_EXPANDED_KEY = "obs-live-suite-sidebar-expanded";
const COLLAPSED_SECTIONS_KEY = "obs-live-suite-collapsed-sections";
const SIDEBAR_WIDTH_COLLAPSED = 48;
const SIDEBAR_WIDTH_EXPANDED = 220;

// ---------------------------------------------------------------------------
// LIVE mode panels (same as LiveModeRail)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ADMIN mode navigation sections (same as AdminSidebar)
// ---------------------------------------------------------------------------

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  id: string;
  labelKey: string;
  items: NavItem[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    id: "library",
    labelKey: "library",
    items: [
      { labelKey: "guests", href: "/assets/guests", icon: Users },
      { labelKey: "posters", href: "/assets/posters", icon: Image },
      { labelKey: "textPresets", href: "/assets/text-presets", icon: Type },
    ],
  },
  {
    id: "customization",
    labelKey: "customization",
    items: [
      { labelKey: "themes", href: "/assets/themes", icon: Palette },
      { labelKey: "profiles", href: "/profiles", icon: FolderOpen },
    ],
  },
  {
    id: "show",
    labelKey: "show",
    items: [
      { labelKey: "overlays", href: "/settings/overlays", icon: Layers },
      { labelKey: "presenterChannel", href: "/settings/presenter", icon: MessageSquare },
      { labelKey: "chatMessages", href: "/settings/chat-messages", icon: Send },
    ],
  },
  {
    id: "connections",
    labelKey: "connections",
    items: [
      { labelKey: "obs", href: "/settings/obs", icon: Plug },
      { labelKey: "twitch", href: "/settings/twitch", icon: Twitch },
      { labelKey: "streamerbot", href: "/settings/streamerbot", icon: Bot },
      { labelKey: "streamDeck", href: "/integrations/stream-deck", icon: Shield },
      { labelKey: "pluginsUpdates", href: "/updater", icon: Download },
    ],
  },
  {
    id: "settings",
    labelKey: "settings",
    items: [
      { labelKey: "general", href: "/settings/general", icon: SettingsIcon },
      { labelKey: "ai", href: "/settings/ai", icon: Sparkles },
      { labelKey: "backend", href: "/settings/backend", icon: Database },
      { labelKey: "paths", href: "/settings/paths", icon: FolderCog },
      { labelKey: "backup", href: "/settings/backup", icon: FileStack },
      { labelKey: "plugins", href: "/settings/plugins", icon: Package },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  // Translations
  const tHeader = useTranslations("dashboard.header");
  const tPanels = useTranslations("dashboard.panels");
  const tSections = useTranslations("navigation.sections");
  const tItems = useTranslations("navigation.items");
  const tSidebar = useTranslations("sidebar");

  // App mode
  const { mode, setMode, isOnAir: appIsOnAir, setIsOnAir } = useAppMode();

  // Connection statuses
  const { isConnected: obsConnected, isOnAir: obsIsOnAir } = useOBSStatus({ refetchInterval: 5000 });
  const { isConfigured: twitchConfigured, isConnected: twitchConnected } = useTwitchAuthStatus();
  const { isConfigured: streamerbotConfigured, status: streamerbotStatus } = useStreamerbotStatus();
  const streamerbotConnected = streamerbotStatus === "connected";

  // Sync OBS on-air to app context
  useEffect(() => {
    setIsOnAir(obsIsOnAir);
  }, [obsIsOnAir, setIsOnAir]);

  // Dockview store (null on non-dashboard pages)
  const dockviewApi = useDockviewStore((s) => s.api);
  const savePositionBeforeClose = useDockviewStore((s) => s.savePositionBeforeClose);
  const getSavedPosition = useDockviewStore((s) => s.getSavedPosition);

  // ---------------------------------------------------------------------------
  // Sidebar expand / collapse
  // ---------------------------------------------------------------------------

  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isPinned || isHovered;

  // Load pinned state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY);
    if (stored === "true") {
      setIsPinned(true);
    }
  }, []);

  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(next));
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Mode toggle (LIVE / ADMIN)
  // ---------------------------------------------------------------------------

  const [showModeConfirmation, setShowModeConfirmation] = useState(false);
  const [pendingMode, setPendingMode] = useState<"LIVE" | "ADMIN" | null>(null);

  const switchMode = useCallback(
    (targetMode: "LIVE" | "ADMIN") => {
      if (targetMode === "LIVE") {
        if (pathname !== "/dashboard" && pathname !== "/") {
          router.push("/dashboard");
        } else {
          setMode(targetMode);
        }
      } else {
        if (pathname === "/dashboard" || pathname === "/") {
          router.push("/settings/general");
        } else {
          setMode(targetMode);
        }
      }
    },
    [pathname, router, setMode]
  );

  const handleModeToggle = useCallback(() => {
    const targetMode = mode === "LIVE" ? "ADMIN" : "LIVE";
    if (appIsOnAir && mode === "LIVE") {
      setPendingMode(targetMode);
      setShowModeConfirmation(true);
    } else {
      switchMode(targetMode);
    }
  }, [mode, appIsOnAir, switchMode]);

  const confirmModeSwitch = useCallback(() => {
    if (pendingMode) {
      switchMode(pendingMode);
      setPendingMode(null);
    }
    setShowModeConfirmation(false);
  }, [pendingMode, switchMode]);

  // ---------------------------------------------------------------------------
  // LIVE panel toggles
  // ---------------------------------------------------------------------------

  const handlePanelToggle = useCallback(
    (panelId: string, component: string, labelKey: string) => {
      if (!dockviewApi) return;

      const panel = dockviewApi.getPanel(panelId);

      if (panel) {
        savePositionBeforeClose(panelId);
        panel.api.close();
      } else {
        const saved = getSavedPosition(panelId);
        let position: Parameters<typeof dockviewApi.addPanel>[0]["position"];

        if (saved?.siblingPanelId) {
          const sibling = dockviewApi.getPanel(saved.siblingPanelId);
          if (sibling) {
            position = {
              referencePanel: saved.siblingPanelId,
              direction: "within",
              index: saved.tabIndex,
            };
          }
        } else if (saved?.neighborPanelId) {
          const neighbor = dockviewApi.getPanel(saved.neighborPanelId);
          if (neighbor) {
            position = {
              referencePanel: saved.neighborPanelId,
              direction: saved.direction || "right",
            };
          }
        }

        dockviewApi.addPanel({
          id: panelId,
          component,
          title: tPanels(labelKey),
          position,
        });
      }
    },
    [dockviewApi, savePositionBeforeClose, getSavedPosition, tPanels]
  );

  const isPanelVisible = useCallback(
    (panelId: string) => {
      if (!dockviewApi) return false;
      return !!dockviewApi.getPanel(panelId);
    },
    [dockviewApi]
  );

  // ---------------------------------------------------------------------------
  // ADMIN section collapse
  // ---------------------------------------------------------------------------

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    if (stored) {
      try {
        setCollapsedSections(new Set(JSON.parse(stored)));
      } catch {
        // ignore malformed data
      }
    }
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
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
  }, []);

  const isActive = useCallback(
    (href: string) => pathname.startsWith(href),
    [pathname]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <aside
        className="relative border-r bg-muted flex flex-col h-full transition-all duration-200 overflow-hidden"
        style={{ width: isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* ============================== HEADER ZONE ============================== */}
        <div className="shrink-0 px-2 pt-3 pb-2">
          {/* Logo + collapse toggle */}
          <div className="flex items-center justify-between h-8">
            {isExpanded ? (
              <span className="text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis pl-1">
                OBS Live Suite
              </span>
            ) : (
              <span className="text-sm font-bold pl-1">OLS</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0"
              onClick={togglePin}
              title={isPinned ? tSidebar("collapse") : tSidebar("expand")}
            >
              {isPinned ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Separator */}
          <div className="border-b my-2" />

          {/* Connection indicators */}
          <div className="space-y-1">
            {/* OBS status */}
            <OBSStatusIndicator
              isConnected={obsConnected}
              isOnAir={obsIsOnAir}
              isExpanded={isExpanded}
              tSidebar={tSidebar}
            />

            {/* Twitch (only if configured) */}
            {twitchConfigured && (
              <ConnectionIndicator
                href="/settings/twitch"
                isConnected={twitchConnected}
                label={tSidebar("twitch")}
                isExpanded={isExpanded}
              />
            )}

            {/* Streamerbot (only if configured) */}
            {streamerbotConfigured && (
              <ConnectionIndicator
                href="/settings/streamerbot"
                isConnected={streamerbotConnected}
                label={tSidebar("streamerbot")}
                isExpanded={isExpanded}
              />
            )}
          </div>
        </div>

        {/* ============================== MODE TOGGLE ============================== */}
        {isExpanded ? (
          <div className="shrink-0 border-t border-b px-2 py-2">
            <div className="flex items-center justify-center gap-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  mode === "LIVE" ? "text-foreground" : "text-muted-foreground"
                )}
              >
                LIVE
              </span>
              <Switch
                checked={mode === "ADMIN"}
                onCheckedChange={handleModeToggle}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  mode === "ADMIN" ? "text-foreground" : "text-muted-foreground"
                )}
              >
                ADMIN
              </span>
            </div>
          </div>
        ) : (
          <div className="shrink-0 border-t" />
        )}

        {/* ============================== NAV ZONE ============================== */}
        <nav className="flex-1 overflow-y-auto py-2">
          {mode === "LIVE" ? (
            /* LIVE mode: panel toggles */
            <div>
              {PANELS.map((panel) => {
                const Icon = panel.icon;
                const isVisible = isPanelVisible(panel.id);
                const label = tPanels(panel.labelKey);
                const disabled = !dockviewApi;

                return (
                  <button
                    key={panel.id}
                    onClick={() => handlePanelToggle(panel.id, panel.component, panel.labelKey)}
                    disabled={disabled}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 transition-colors relative",
                      disabled
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : isVisible
                          ? "[background-color:hsl(var(--sidebar-accent))] text-accent-foreground"
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
            </div>
          ) : (
            /* ADMIN mode: settings nav sections */
            <div className="space-y-3 px-2">
              {NAVIGATION_SECTIONS.map((section) => {
                const isCollapsed = collapsedSections.has(section.id);

                return (
                  <div key={section.id}>
                    {/* Section header (only show when expanded) */}
                    {isExpanded ? (
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="flex items-center justify-between w-full text-[10px] font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors mb-1 px-1"
                      >
                        <span>{tSections(section.labelKey)}</span>
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    ) : (
                      /* When collapsed, show a thin separator between sections */
                      <div className="border-b my-1" />
                    )}

                    {!isCollapsed && (
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const active = isActive(item.href);
                          const Icon = item.icon;
                          const label = tItems(item.labelKey);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 px-2 py-2 text-sm rounded-md transition-colors",
                                active
                                  ? "[background-color:hsl(var(--sidebar-accent))] text-accent-foreground border-l-2 border-primary"
                                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              )}
                              title={isExpanded ? undefined : label}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              {isExpanded && (
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                                  {label}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {/* ============================== FOOTER ============================== */}
        <div className="shrink-0 border-t p-2">
          <Link
            href="/help"
            className="flex items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground rounded-md transition-colors"
            title={isExpanded ? undefined : tItems("helpSupport")}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            {isExpanded && (
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                {tItems("helpSupport")}
              </span>
            )}
          </Link>
        </div>
      </aside>

      {/* ============================== ON AIR CONFIRMATION DIALOG ============================== */}
      <AlertDialog open={showModeConfirmation} onOpenChange={setShowModeConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tHeader("onAirDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tHeader("onAirDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingMode(null);
                setShowModeConfirmation(false);
              }}
            >
              {tHeader("stayInLive")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmModeSwitch}>
              {tHeader("switchToAdminConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** OBS connection status with special ON AIR / OFF AIR / Disconnected states */
function OBSStatusIndicator({
  isConnected,
  isOnAir,
  isExpanded,
  tSidebar,
}: {
  isConnected: boolean;
  isOnAir: boolean;
  isExpanded: boolean;
  tSidebar: ReturnType<typeof useTranslations>;
}) {
  const containerClass = cn(
    "flex items-center py-1.5 rounded-md",
    isExpanded ? "gap-2 px-2" : "justify-center"
  );

  if (!isConnected) {
    return (
      <Link
        href="/settings/obs"
        className={cn(containerClass, "text-sm hover:bg-accent/50 transition-colors")}
        title={isExpanded ? undefined : tSidebar("obsDisconnected")}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
        {isExpanded && (
          <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
            {tSidebar("obsDisconnected")}
          </span>
        )}
      </Link>
    );
  }

  if (isOnAir) {
    return (
      <div
        className={containerClass}
        title={isExpanded ? undefined : tSidebar("onAir")}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
        {isExpanded && (
          <span className="text-xs font-bold text-red-500 animate-pulse whitespace-nowrap">
            {tSidebar("onAir")}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={containerClass}
      title={isExpanded ? undefined : tSidebar("offAir")}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
      {isExpanded && (
        <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
          {tSidebar("offAir")}
        </span>
      )}
    </div>
  );
}

/** Generic connection indicator for Twitch / Streamerbot */
function ConnectionIndicator({
  href,
  isConnected,
  label,
  isExpanded,
}: {
  href: string;
  isConnected: boolean;
  label: string;
  isExpanded: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors",
        isExpanded ? "gap-2 px-2" : "justify-center"
      )}
      title={isExpanded ? undefined : label}
    >
      <div
        className={cn(
          "w-2.5 h-2.5 rounded-full shrink-0",
          isConnected ? "bg-green-500" : "bg-red-500"
        )}
      />
      {isExpanded && (
        <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
          {label}
        </span>
      )}
    </Link>
  );
}
