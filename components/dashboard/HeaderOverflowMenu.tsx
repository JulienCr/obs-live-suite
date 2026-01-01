"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
import { MoreVertical, Keyboard, HelpCircle, Info, ToggleLeft, Layout } from "lucide-react";
import { useAppMode } from "@/components/shell/AppModeContext";
import { useLayoutPresets } from "@/components/shell/LayoutPresetsContext";

export function HeaderOverflowMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("dashboard.overflowMenu");
  const { mode, setMode, isOnAir } = useAppMode();
  const [showModeConfirmation, setShowModeConfirmation] = useState(false);
  const [pendingMode, setPendingMode] = useState<"LIVE" | "ADMIN" | null>(null);

  // Try to get layout presets (may not be available on non-dashboard pages)
  let layoutPresets: ReturnType<typeof useLayoutPresets> | null = null;
  try {
    layoutPresets = useLayoutPresets();
  } catch {
    // Not in dashboard context, that's fine
  }

  const isOnDashboard = pathname === "/" || pathname === "/dashboard";

  const handleModeToggle = () => {
    const targetMode = mode === "LIVE" ? "ADMIN" : "LIVE";

    if (isOnAir && mode === "LIVE") {
      // Show confirmation dialog if ON AIR and trying to leave LIVE mode
      setPendingMode(targetMode);
      setShowModeConfirmation(true);
    } else {
      switchMode(targetMode);
    }
  };

  const switchMode = (targetMode: "LIVE" | "ADMIN") => {
    // Navigate first - AppShell will sync mode from URL
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
  };

  const confirmModeSwitch = () => {
    if (pendingMode) {
      switchMode(pendingMode);
      setPendingMode(null);
    }
    setShowModeConfirmation(false);
  };

  const cancelModeSwitch = () => {
    setPendingMode(null);
    setShowModeConfirmation(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t("menu")}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Layout Presets (only in LIVE mode on dashboard) */}
          {mode === "LIVE" && isOnDashboard && layoutPresets && (
            <>
              <DropdownMenuLabel className="text-xs">{t("layoutPresets")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => layoutPresets.applyPreset("live")}>
                <Layout className="w-4 h-4 mr-2" />
                {t("liveDefault")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => layoutPresets.applyPreset("prep")}>
                <Layout className="w-4 h-4 mr-2" />
                {t("prepGrid")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => layoutPresets.applyPreset("minimal")}>
                <Layout className="w-4 h-4 mr-2" />
                {t("minimal")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={handleModeToggle}>
            <ToggleLeft className="w-4 h-4 mr-2" />
            {mode === "LIVE" ? t("switchToAdmin") : t("switchToLive")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/shortcuts")}>
            <Keyboard className="w-4 h-4 mr-2" />
            {t("keyboardShortcuts")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <HelpCircle className="w-4 h-4 mr-2" />
            {t("help")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Info className="w-4 h-4 mr-2" />
            {t("about")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showModeConfirmation} onOpenChange={setShowModeConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("onAirDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("onAirDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelModeSwitch}>
              {t("stayInLive")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmModeSwitch}>
              {t("switchToAdminConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
