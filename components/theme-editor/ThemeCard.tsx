"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Zap, Play } from "lucide-react";
import { Theme } from "@/lib/models/Theme";
import { useTranslations } from "next-intl";

interface ThemeCardProps {
  theme: Theme;
  isActive: boolean;
  onEdit: (theme: Theme) => void;
  onDelete: (id: string) => void;
  onApply: (id: string) => void;
  onTestLowerThird?: () => void;
  onTestCountdown?: () => void;
}

/**
 * Theme preview card in list view
 */
export function ThemeCard({
  theme,
  isActive,
  onEdit,
  onDelete,
  onApply,
  onTestLowerThird,
  onTestCountdown,
}: ThemeCardProps) {
  const t = useTranslations("themeEditor.card");
  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{theme.name}</h3>
              {isActive && (
                <Badge variant="default" className="text-xs">
                  {t("active")}
                </Badge>
              )}
            </div>
            {theme.isGlobal && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {t("global")}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(theme)}
              title={t("editTheme")}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            {!theme.isGlobal && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(theme.id)}
                title={t("deleteTheme")}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mini Preview */}
        <div className="border rounded p-2 bg-muted/30">
          <div className="text-[10px] text-muted-foreground mb-1">{t("preview")}</div>
          <div
            className="h-16 rounded flex items-center gap-2 px-2"
            style={{
              background: `linear-gradient(90deg, ${theme.colors.surface}E6 0%, ${theme.colors.surface}D9 100%)`,
            }}
          >
            <div
              className="w-1 h-8 rounded"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <div className="flex-1">
              <div
                className="text-xs font-bold"
                style={{
                  fontFamily: theme.lowerThirdFont.family,
                  color: theme.colors.text,
                }}
              >
                Sample Text
              </div>
              <div
                className="text-[10px]"
                style={{
                  fontFamily: theme.countdownFont.family,
                  background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.accent} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                00:00
              </div>
            </div>
          </div>
        </div>

        {/* Color Swatches */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">{t("colors")}</div>
          <div className="flex gap-1">
            {Object.entries(theme.colors).map(([key, value]) => (
              <div
                key={key}
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: value }}
                title={`${key}: ${value}`}
              />
            ))}
          </div>
        </div>

        {/* Template Info */}
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("lowerThird")}</span>
            <span className="font-medium capitalize">{theme.lowerThirdTemplate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("countdown")}</span>
            <span className="font-medium capitalize">{theme.countdownStyle}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2">
          {!isActive ? (
            <Button
              className="flex-1"
              variant="outline"
              size="sm"
              onClick={() => onApply(theme.id)}
            >
              <Zap className="w-4 h-4 mr-2" />
              {t("applyTheme")}
            </Button>
          ) : (
            <>
              <Button
                className="flex-1"
                variant="outline"
                size="sm"
                onClick={onTestLowerThird}
                title={t("testLowerThird")}
              >
                <Play className="w-4 h-4 mr-2" />
                {t("testL3")}
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                size="sm"
                onClick={onTestCountdown}
                title={t("testCountdown")}
              >
                <Play className="w-4 h-4 mr-2" />
                {t("testCD")}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
