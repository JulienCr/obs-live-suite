"use client";

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
import { MoreVertical, Keyboard, HelpCircle, Info, Layout } from "lucide-react";
import { useAppMode } from "@/components/shell/AppModeContext";
import { useOptionalLayoutPresets } from "@/components/shell/LayoutPresetsContext";

export function HeaderOverflowMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("dashboard.overflowMenu");
  const { mode } = useAppMode();

  const layoutPresets = useOptionalLayoutPresets();

  const isOnDashboard = pathname === "/" || pathname === "/dashboard";

  return (
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
  );
}
