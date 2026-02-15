"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardActionBar } from "@/components/ui/CardActionBar";
import { Zap, Edit, Power, PowerOff, Trash2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TextPreset } from "@/lib/queries";

const SIDE_LABELS: Record<TextPreset["side"], string> = {
  left: "L",
  right: "R",
  center: "C",
};

const BODY_PREVIEW_LENGTH = 60;

interface TextPresetCardProps {
  preset: TextPreset;
  variant?: "enabled" | "disabled";
  onQuickShow?: (preset: TextPreset) => void;
  onEdit?: (preset: TextPreset) => void;
  onToggleEnabled?: (preset: TextPreset) => void;
  onDelete?: (preset: TextPreset) => void;
}

/**
 * Reusable text preset card component with quick actions
 */
export function TextPresetCard({
  preset,
  variant = "enabled",
  onQuickShow,
  onEdit,
  onToggleEnabled,
  onDelete,
}: TextPresetCardProps) {
  const t = useTranslations("assets.textPresetCard");
  const isEnabled = variant === "enabled";

  return (
    <div
      className={cn(
        "group relative border rounded-lg p-3 hover:shadow-md transition-all",
        !isEnabled && "opacity-60"
      )}
    >
      {/* Name and Body Preview */}
      <div className="flex flex-col items-center space-y-2">
        <div className="text-center w-full">
          <h3 className="font-medium text-sm truncate px-1" title={preset.name}>
            {preset.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate px-1" title={preset.body}>
            {preset.body.substring(0, BODY_PREVIEW_LENGTH)}
          </p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {SIDE_LABELS[preset.side]}
          </Badge>
          {preset.imageUrl && (
            <Badge variant="outline" className="text-xs">
              <ImageIcon className="w-3 h-3" />
            </Badge>
          )}
          <Badge variant={isEnabled ? "default" : "secondary"} className="text-xs">
            {isEnabled ? t("active") : t("disabled")}
          </Badge>
        </div>
      </div>

      {/* Quick Actions - Show on hover */}
      <div className="mt-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isEnabled && onQuickShow && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => onQuickShow(preset)}
            title={t("quickShowTitle")}
          >
            <Zap className="w-3 h-3 mr-2" />
            {t("quickShow")}
          </Button>
        )}

        {/* Action Buttons */}
        <CardActionBar
          actions={[
            ...(onEdit ? [{ icon: Edit, onClick: () => onEdit(preset), title: t("edit") }] : []),
            ...(onToggleEnabled ? [{
              icon: isEnabled ? PowerOff : Power,
              onClick: () => onToggleEnabled(preset),
              variant: (isEnabled ? "outline-solid" : "default") as "outline-solid" | "default",
              title: isEnabled ? t("disable") : t("enable"),
            }] : []),
            ...(onDelete ? [{ icon: Trash2, onClick: () => onDelete(preset), variant: "destructive" as const, title: t("delete") }] : []),
          ]}
          className="opacity-100!"
        />
      </div>
    </div>
  );
}
