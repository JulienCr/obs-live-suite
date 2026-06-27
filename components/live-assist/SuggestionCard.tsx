"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Suggestion } from "@/lib/models/LiveAssist";

interface Props {
  suggestion: Suggestion;
  onApply: (s: Suggestion, target: "pin" | "on-air" | "left" | "right") => void;
  onDismiss: (s: Suggestion) => void;
}

export function SuggestionCard({ suggestion: s, onApply, onDismiss }: Props) {
  const t = useTranslations("dashboard.liveAssist");
  const isPending = s.status === "pending";
  const isDismissed = s.status === "dismissed";
  const isDefinition = s.intent === "definition";
  const isLocalPoster = s.intent === "local-poster";
  const [expanded, setExpanded] = useState(false);
  // Once acted on, collapse to just icon + title to save space; an explicit
  // expand reveals the detail again. Pending cards always show their detail.
  const showDetail = isPending || expanded;
  const icon = isDefinition ? "📖" : isLocalPoster ? "🖼️" : s.intent === "poster-tmdb" ? "🎬" : "🎭";

  return (
    <div className={`rounded border p-3 flex flex-col gap-2 ${isPending ? "" : "opacity-70"}`}>
      {/* Header: icon + title. Once acted on it becomes a collapse/expand toggle. */}
      {isPending ? (
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-medium">{s.title}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex items-center gap-2 text-left w-full"
        >
          <span>{icon}</span>
          <span className="font-medium flex-1 truncate">{s.title}</span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {showDetail && (
        <>
          {s.preview.kind === "image" && s.preview.imageUrl ? (
            <img src={s.preview.imageUrl} alt={s.title} className="max-h-40 rounded object-contain" />
          ) : (
            <p className="text-sm text-muted-foreground">{s.preview.text}</p>
          )}
          <p className="text-xs italic opacity-60">{s.triggerExcerpt}</p>
        </>
      )}

      {/* Actions. Pending → full set. Dismissed → keep a way to change your mind
          (re-validate), shown even while collapsed. Applied → none (it's done). */}
      {(isPending || isDismissed) && (
        <div className="flex gap-2 flex-wrap">
          {isLocalPoster ? (
            // A local poster is shown on the program overlay on the chosen side.
            <>
              <Button size="sm" onClick={() => onApply(s, "left")}>{t("posterLeft")}</Button>
              <Button size="sm" variant="outline" onClick={() => onApply(s, "right")}>{t("posterRight")}</Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => onApply(s, "pin")}>
                {isDefinition ? t("quickText") : t("validate")}
              </Button>
              {isDefinition && (
                <Button size="sm" variant="outline" onClick={() => onApply(s, "on-air")}>
                  {t("onAir")}
                </Button>
              )}
            </>
          )}
          {isPending && (
            <Button size="sm" variant="ghost" onClick={() => onDismiss(s)}>
              {t("dismiss")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
