"use client";

import { Wheat } from "lucide-react";
import { useTranslations } from "next-intl";
import { WordHarvestMidiSettings } from "@/components/settings/WordHarvestMidiSettings";

export default function WordHarvestSettingsPage() {
  const t = useTranslations("wordHarvest");
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2 mb-2">
          <Wheat className="w-6 h-6" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("settings.description")}
        </p>
      </div>

      <WordHarvestMidiSettings />
    </div>
  );
}
