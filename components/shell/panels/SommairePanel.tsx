"use client";

import { useState, useCallback, useEffect } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { parseSommaireMarkdown, type SommaireCategory } from "@/lib/models/Sommaire";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const config: PanelConfig = { id: "sommaire", context: "dashboard" };

const PLACEHOLDER = `# Catégorie 1
## Sous-élément A
## Sous-élément B

# Catégorie 2
## Sous-élément C`;

export function SommairePanel(_props: IDockviewPanelProps) {
  const t = useTranslations("dashboard.sommaire");
  const [markdown, setMarkdown] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeSubIndex, setActiveSubIndex] = useState(-1);
  const [parsedCategories, setParsedCategories] = useState<SommaireCategory[]>([]);

  // Load saved markdown from DB on mount
  useEffect(() => {
    fetch("/api/settings/sommaire")
      .then((res) => res.json())
      .then((data) => {
        if (data.markdown) setMarkdown(data.markdown);
      })
      .catch(() => {});
  }, []);

  // Save markdown to DB (debounced on change, immediate on show)
  const saveMarkdown = useCallback((md: string) => {
    fetch("/api/settings/sommaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: md }),
    }).catch(() => {});
  }, []);

  const sendAction = useCallback(async (action: string, payload?: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/overlays/sommaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      if (!res.ok) throw new Error("Request failed");
    } catch {
      toast.error(t("error"));
    }
  }, [t]);

  const handleShow = useCallback(() => {
    const categories = parseSommaireMarkdown(markdown);
    if (categories.length === 0) {
      toast.error(t("noCategories"));
      return;
    }
    setParsedCategories(categories);
    setActiveIndex(-1);
    setActiveSubIndex(-1);
    setIsVisible(true);
    saveMarkdown(markdown);
    sendAction("show", { categories, activeIndex: -1, activeSubIndex: -1 });
  }, [markdown, sendAction, saveMarkdown, t]);

  const handleHide = useCallback(() => {
    setIsVisible(false);
    setActiveIndex(-1);
    setActiveSubIndex(-1);
    sendAction("hide");
  }, [sendAction]);

  const handleHighlight = useCallback((catIdx: number, subIdx = -1) => {
    setActiveIndex(catIdx);
    setActiveSubIndex(subIdx);
    sendAction("highlight", { activeIndex: catIdx, activeSubIndex: subIdx });
  }, [sendAction]);

  // Build flat navigation list: [catIdx, subIdx] pairs
  const navItems: [number, number][] = [];
  for (const cat of parsedCategories) {
    navItems.push([cat.index, -1]);
    for (let i = 0; i < cat.items.length; i++) {
      navItems.push([cat.index, i]);
    }
  }

  const currentNavIdx = navItems.findIndex(
    ([c, s]) => c === activeIndex && s === activeSubIndex
  );

  const handlePrev = useCallback(() => {
    if (navItems.length === 0) return;
    const idx = currentNavIdx <= 0 ? navItems.length - 1 : currentNavIdx - 1;
    const [c, s] = navItems[idx];
    handleHighlight(c, s);
  }, [currentNavIdx, navItems, handleHighlight]);

  const handleNext = useCallback(() => {
    if (navItems.length === 0) return;
    const idx = currentNavIdx >= navItems.length - 1 ? 0 : currentNavIdx + 1;
    const [c, s] = navItems[idx];
    handleHighlight(c, s);
  }, [currentNavIdx, navItems, handleHighlight]);

  return (
    <BasePanelWrapper config={config}>
      <div className="flex flex-col gap-3 p-3 h-full overflow-auto">
        {/* Markdown input */}
        <Textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          onBlur={() => saveMarkdown(markdown)}
          placeholder={PLACEHOLDER}
          className="min-h-[120px] font-mono text-xs resize-y"
        />

        {/* Show / Hide buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleShow}
            disabled={!markdown.trim()}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            {t("show")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleHide}
            disabled={!isVisible}
            className="flex-1"
          >
            <EyeOff className="h-4 w-4 mr-1" />
            {t("hide")}
          </Button>
        </div>

        {/* Category + sub-item highlight controls */}
        {isVisible && parsedCategories.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-3">
            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={handlePrev} className="h-7 w-7 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleHighlight(-1)} className="h-7 px-2 text-xs">
                <X className="h-3 w-3 mr-1" />
                {t("none")}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleNext} className="h-7 w-7 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Category + sub-item list */}
            <div className="flex flex-col gap-0.5">
              {parsedCategories.map((cat) => (
                <div key={cat.index}>
                  {/* Category row */}
                  <button
                    onClick={() => handleHighlight(cat.index)}
                    className={cn(
                      "w-full text-left text-sm px-2 py-1.5 rounded transition-colors font-medium",
                      cat.index === activeIndex && activeSubIndex === -1
                        ? "bg-primary text-primary-foreground"
                        : cat.index === activeIndex
                          ? "bg-primary/20"
                          : "hover:bg-muted"
                    )}
                  >
                    <span className="opacity-50 mr-2">{cat.index + 1}</span>
                    {cat.title}
                  </button>

                  {/* Sub-item rows */}
                  {cat.items.map((item, itemIdx) => (
                    <button
                      key={itemIdx}
                      onClick={() => handleHighlight(cat.index, itemIdx)}
                      className={cn(
                        "w-full text-left text-xs pl-7 pr-2 py-1 rounded transition-colors",
                        cat.index === activeIndex && activeSubIndex === itemIdx
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted opacity-70"
                      )}
                    >
                      <span className="opacity-40 mr-1">•</span>
                      {item}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BasePanelWrapper>
  );
}
