"use client";

import { Wheat } from "lucide-react";
import { WordHarvestMidiSettings } from "@/components/settings/WordHarvestMidiSettings";

export default function WordHarvestSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2 mb-2">
          <Wheat className="w-6 h-6" />
          Récolte de mots
        </h1>
        <p className="text-muted-foreground text-sm">
          Configuration MIDI pour les événements du jeu de récolte de mots pendant les impros.
        </p>
      </div>

      <WordHarvestMidiSettings />
    </div>
  );
}
