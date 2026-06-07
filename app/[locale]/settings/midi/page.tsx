"use client";

import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { MidiSettings } from "@/components/settings/MidiSettings";

export default function MidiSettingsPage() {
  const t = useTranslations("midi");
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2 mb-2">
          <Music className="w-6 h-6" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <MidiSettings />
    </div>
  );
}
