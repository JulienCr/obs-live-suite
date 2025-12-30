"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

export default function ShortcutsPage() {
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmdKey = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    {
      category: "General",
      items: [
        { keys: [`${cmdKey}`, "P"], description: "Open Command Palette" },
        { keys: ["ESC"], description: "Unfocus input/textarea" },
        { keys: ["F"], description: "Toggle Fullscreen Mode" },
      ],
    },
    {
      category: "Mode Switching",
      items: [
        { keys: [`${cmdKey}`, "Shift", "L"], description: "Switch to LIVE Mode" },
        { keys: [`${cmdKey}`, "Shift", "A"], description: "Switch to ADMIN Mode" },
      ],
    },
    {
      category: "Layout Presets (Dashboard Only)",
      items: [
        { keys: [`${cmdKey}`, "1"], description: "Live Layout (Default - Tabbed Panels)" },
        { keys: [`${cmdKey}`, "2"], description: "Prep Layout (Grid - All Panels Visible)" },
        { keys: [`${cmdKey}`, "3"], description: "Minimal Layout (Lower Third + Macros Only)" },
      ],
    },
    {
      category: "Dashboard Panels",
      items: [
        { keys: ["L"], description: "Focus Lower Third Text Input" },
        { keys: ["G"], description: "Focus Lower Third Guest Input" },
        { keys: ["P"], description: "Focus Poster Quick Add Input" },
        { keys: ["1"], description: "Show Guest 1" },
        { keys: ["2"], description: "Show Guest 2" },
        { keys: ["3"], description: "Show Guest 3" },
        { keys: ["4"], description: "Show Guest 4" },
        { keys: ["5"], description: "Show Guest 5" },
        { keys: ["6"], description: "Show Guest 6" },
        { keys: ["7"], description: "Show Guest 7" },
        { keys: ["8"], description: "Show Guest 8" },
        { keys: ["9"], description: "Show Guest 9" },
        { keys: ["0"], description: "Show Guest 10" },
      ],
    },
    {
      category: "Quiz Host",
      items: [
        { keys: ["Space"], description: "Lock Answers / Reveal Answer" },
        { keys: ["←"], description: "Previous Question" },
        { keys: ["→"], description: "Next Question" },
        { keys: ["T"], description: "Add 10 Seconds to Timer" },
        { keys: ["V"], description: "Toggle Viewer Input" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Keyboard className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Keyboard Shortcuts</h1>
          </div>
          <p className="text-muted-foreground">
            Use these shortcuts to navigate and control OBS Live Suite more efficiently.
          </p>
        </div>

        <div className="space-y-6">
          {shortcuts.map((section) => (
            <Card key={section.category}>
              <CardHeader>
                <CardTitle>{section.category}</CardTitle>
                <CardDescription>
                  {section.category === "Layout Presets (Dashboard Only)" &&
                    "Quickly switch between different panel arrangements on the dashboard"}
                  {section.category === "Dashboard Panels" &&
                    "These shortcuts only work when you're not typing in an input field"}
                  {section.category === "Quiz Host" &&
                    "These shortcuts only work on the Quiz Host page"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <span className="text-sm">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs px-2 py-1"
                            >
                              {key}
                            </Badge>
                            {keyIdx < item.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Most shortcuts that involve single letters (like F, L, G, P, etc.)
            will not work when you're typing in an input field or textarea. Press ESC to unfocus
            and use the shortcuts.
          </p>
        </div>
      </div>
    </div>
  );
}
