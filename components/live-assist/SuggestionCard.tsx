"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Suggestion } from "@/lib/models/LiveAssist";

interface Props {
  suggestion: Suggestion;
  onApply: (s: Suggestion, target: "pin" | "on-air") => void;
  onDismiss: (s: Suggestion) => void;
}

export function SuggestionCard({ suggestion: s, onApply, onDismiss }: Props) {
  const t = useTranslations("dashboard.liveAssist");
  const dimmed = s.status !== "pending";
  return (
    <div className={`rounded border p-3 flex flex-col gap-2 ${dimmed ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2">
        <span>{s.intent === "poster" ? "🎭" : "📖"}</span>
        <span className="font-medium">{s.title}</span>
      </div>
      {s.preview.kind === "image" && s.preview.imageUrl ? (
        <img src={s.preview.imageUrl} alt={s.title} className="max-h-40 rounded object-contain" />
      ) : (
        <p className="text-sm text-muted-foreground">{s.preview.text}</p>
      )}
      <p className="text-xs italic opacity-60">{s.triggerExcerpt}</p>
      {!dimmed && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onApply(s, "pin")}>
            {s.intent === "definition" ? t("pin") : t("validate")}
          </Button>
          {s.intent === "definition" && (
            <Button size="sm" variant="outline" onClick={() => onApply(s, "on-air")}>
              {t("onAir")}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onDismiss(s)}>
            {t("dismiss")}
          </Button>
        </div>
      )}
    </div>
  );
}
