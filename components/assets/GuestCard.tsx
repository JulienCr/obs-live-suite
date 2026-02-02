"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardActionBar } from "@/components/ui/CardActionBar";
import { Zap, Edit, Power, PowerOff, Trash2 } from "lucide-react";
import type { Guest } from "@/lib/queries";

interface GuestCardProps {
  guest: Guest;
  variant?: "enabled" | "disabled";
  onQuickLowerThird?: (guest: Guest) => void;
  onEdit?: (guest: Guest) => void;
  onToggleEnabled?: (guest: Guest) => void;
  onDelete?: (guest: Guest) => void;
}

/**
 * Reusable guest card component with avatar and quick actions
 */
export function GuestCard({
  guest,
  variant = "enabled",
  onQuickLowerThird,
  onEdit,
  onToggleEnabled,
  onDelete,
}: GuestCardProps) {
  const t = useTranslations("assets.guestCard");
  const isEnabled = variant === "enabled";

  return (
    <div
      className={`group relative border rounded-lg p-3 hover:shadow-md transition-all ${
        !isEnabled ? "opacity-60" : ""
      }`}
    >
      {/* Avatar and Info */}
      <div className="flex flex-col items-center space-y-2">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden ring-2 ring-offset-2 ring-offset-background"
          style={{
            backgroundColor: guest.accentColor,
            ["--tw-ring-color" as string]: guest.accentColor + "40"
          }}
        >
          {guest.avatarUrl ? (
            <img
              src={guest.avatarUrl}
              alt={guest.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl">
              {guest.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="text-center w-full">
          <h3 className="font-medium text-sm truncate px-1" title={guest.displayName}>
            {guest.displayName}
          </h3>
          {guest.subtitle && (
            <p className="text-xs text-muted-foreground truncate px-1" title={guest.subtitle}>
              {guest.subtitle}
            </p>
          )}
        </div>

        {/* Status Badge */}
        <Badge variant={isEnabled ? "default" : "secondary"} className="text-xs">
          {isEnabled ? t("active") : t("disabled")}
        </Badge>
      </div>

      {/* Quick Actions - Show on hover */}
      <div className="mt-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Quick LT Button - Primary action for enabled guests */}
        {isEnabled && onQuickLowerThird && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => onQuickLowerThird(guest)}
            title={t("quickLTTitle")}
          >
            <Zap className="w-3 h-3 mr-2" />
            {t("quickLT")}
          </Button>
        )}

        {/* Action Buttons */}
        <CardActionBar
          actions={[
            ...(onEdit ? [{ icon: Edit, onClick: () => onEdit(guest), title: t("edit") }] : []),
            ...(onToggleEnabled ? [{
              icon: isEnabled ? PowerOff : Power,
              onClick: () => onToggleEnabled(guest),
              variant: isEnabled ? "outline" as const : "default" as const,
              title: isEnabled ? t("disable") : t("enable"),
            }] : []),
            ...(onDelete ? [{ icon: Trash2, onClick: () => onDelete(guest), variant: "destructive" as const, title: t("delete") }] : []),
          ]}
          className="!opacity-100"
        />
      </div>
    </div>
  );
}

