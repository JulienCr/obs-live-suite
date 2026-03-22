"use client";

import { Type } from "lucide-react";
import { useTranslations } from "next-intl";
import { TitleRevealDefaultsSettings } from "@/components/settings/TitleRevealDefaultsSettings";

export default function TitleRevealSettingsPage() {
  const t = useTranslations("settings.titleReveal");
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2 mb-2">
          <Type className="w-6 h-6" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("description")}
        </p>
      </div>

      <TitleRevealDefaultsSettings />
    </div>
  );
}
