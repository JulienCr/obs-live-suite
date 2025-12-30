"use client";

import { CountdownStyle } from "@/lib/models/Theme";
import { TemplateSelector } from "../inputs/TemplateSelector";
import { FontEditor } from "../inputs/FontEditor";
import { useThemeEditor } from "../ThemeEditorContext";

const STYLE_OPTIONS = [
  {
    value: CountdownStyle.BOLD,
    label: "Bold",
    description: "Large bold numbers",
  },
  {
    value: CountdownStyle.CORNER,
    label: "Corner",
    description: "Compact corner display",
  },
  {
    value: CountdownStyle.BANNER,
    label: "Banner",
    description: "Full-width banner",
  },
];

/**
 * Countdown tab for theme editor
 */
export function CountdownTab() {
  const {
    formData,
    updateCountdownStyle,
    updateCountdownFont,
    resetCountdownFont,
  } = useThemeEditor();

  return (
    <div className="space-y-6">
      <div>
        <TemplateSelector
          label="Countdown Style"
          value={formData.countdownStyle || CountdownStyle.BOLD}
          onChange={updateCountdownStyle}
          options={STYLE_OPTIONS}
        />
      </div>

      <div className="pt-4 border-t">
        <FontEditor
          label="Countdown Font"
          value={formData.countdownFont || { family: "Courier New, monospace", size: 80, weight: 900 }}
          onChange={(font) => updateCountdownFont(font)}
          onReset={resetCountdownFont}
        />
      </div>
    </div>
  );
}
