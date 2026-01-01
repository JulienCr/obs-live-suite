"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Theme } from "@/lib/models/Theme";
import { ThemeCard } from "./ThemeCard";
import { useTranslations } from "next-intl";

interface ThemeListProps {
  themes: Theme[];
  activeThemeId: string | null;
  onEdit: (theme: Theme) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onApply: (id: string) => void;
  onTestLowerThird: () => void;
  onTestCountdown: () => void;
}

/**
 * Grid layout of theme cards
 */
export function ThemeList({
  themes,
  activeThemeId,
  onEdit,
  onCreate,
  onDelete,
  onApply,
  onTestLowerThird,
  onTestCountdown,
}: ThemeListProps) {
  const t = useTranslations("themeEditor.list");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("newTheme")}
        </Button>
      </div>

      {themes.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground mb-4">{t("noThemes")}</p>
          <Button onClick={onCreate}>
            <Plus className="w-4 h-4 mr-2" />
            {t("createFirst")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={theme.id === activeThemeId}
              onEdit={onEdit}
              onDelete={onDelete}
              onApply={onApply}
              onTestLowerThird={onTestLowerThird}
              onTestCountdown={onTestCountdown}
            />
          ))}
        </div>
      )}
    </div>
  );
}
