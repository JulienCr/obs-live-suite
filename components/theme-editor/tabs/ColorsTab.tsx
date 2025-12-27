"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { ColorPicker } from "../inputs/ColorPicker";
import { useThemeEditor } from "../ThemeEditorContext";

/**
 * Colors tab for theme editor
 */
export function ColorsTab() {
  const { formData, updateColor, resetColors } = useThemeEditor();

  const colors = formData.colors || {
    primary: "#3B82F6",
    accent: "#60A5FA",
    surface: "#1E293B",
    text: "#F8FAFC",
    success: "#10B981",
    warn: "#F59E0B",
  };

  const colorDescriptions: Record<string, string> = {
    primary: "Main brand color",
    accent: "Secondary/highlight color",
    surface: "Background/surface color",
    text: "Primary text color",
    success: "Success state color",
    warn: "Warning state color",
  };

  return (
    <div className="space-y-6">
      {/* Color Scheme Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Color Scheme</h3>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={resetColors}
            className="h-7 px-2 text-xs"
            title="Reset colors to default"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(colors) as Array<keyof typeof colors>).map((key) => (
            <ColorPicker
              key={key}
              label={key}
              value={colors[key]}
              onChange={(value) => updateColor(key, value)}
              description={colorDescriptions[key]}
            />
          ))}
        </div>
      </div>

      {/* Color Reference Guide */}
      <div className="pt-4 border-t">
        <h3 className="text-sm font-semibold mb-3">Color Usage Guide</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="font-semibold mb-1">Primary</div>
            <div className="text-muted-foreground">Main bars, backgrounds</div>
          </div>
          <div>
            <div className="font-semibold mb-1">Accent</div>
            <div className="text-muted-foreground">Highlights, borders</div>
          </div>
          <div>
            <div className="font-semibold mb-1">Surface</div>
            <div className="text-muted-foreground">Card backgrounds</div>
          </div>
          <div>
            <div className="font-semibold mb-1">Text</div>
            <div className="text-muted-foreground">Primary text color</div>
          </div>
          <div>
            <div className="font-semibold mb-1">Success</div>
            <div className="text-muted-foreground">Positive states</div>
          </div>
          <div>
            <div className="font-semibold mb-1">Warn</div>
            <div className="text-muted-foreground">Warning states</div>
          </div>
        </div>
      </div>
    </div>
  );
}
