"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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

  const isOnDashboard = pathname === "/" || pathname === "/dashboard" || pathname === "/dashboard-v2";

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
    setMode(targetMode);

    // Navigate to appropriate page based on mode
    if (targetMode === "LIVE") {
      // Always navigate to dashboard in LIVE mode
      if (pathname !== "/dashboard" && pathname !== "/dashboard-v2" && pathname !== "/") {
        router.push("/dashboard");
      }
    } else {
      // In ADMIN mode, if we're on dashboard, navigate to settings
      if (pathname === "/dashboard" || pathname === "/dashboard-v2" || pathname === "/") {
        router.push("/settings/general");
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
          <DropdownMenuLabel>Menu</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Layout Presets (only in LIVE mode on dashboard) */}
          {mode === "LIVE" && isOnDashboard && layoutPresets && (
            <>
              <DropdownMenuLabel className="text-xs">Layout Presets</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => layoutPresets.applyPreset("live")}>
                <Layout className="w-4 h-4 mr-2" />
                Live (Default)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => layoutPresets.applyPreset("prep")}>
                <Layout className="w-4 h-4 mr-2" />
                Prep (Grid)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => layoutPresets.applyPreset("minimal")}>
                <Layout className="w-4 h-4 mr-2" />
                Minimal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={handleModeToggle}>
            <ToggleLeft className="w-4 h-4 mr-2" />
            Switch to {mode === "LIVE" ? "ADMIN" : "LIVE"} Mode
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Keyboard className="w-4 h-4 mr-2" />
            Keyboard Shortcuts
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <HelpCircle className="w-4 h-4 mr-2" />
            Help
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Info className="w-4 h-4 mr-2" />
            About
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showModeConfirmation} onOpenChange={setShowModeConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You are currently ON AIR</AlertDialogTitle>
            <AlertDialogDescription>
              Switching to ADMIN mode will navigate away from the live control surface.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelModeSwitch}>
              Stay in LIVE Mode
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmModeSwitch}>
              Switch to ADMIN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
