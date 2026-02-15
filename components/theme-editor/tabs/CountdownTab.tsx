"use client";

import { CountdownStyle } from "@/lib/models/Theme";
import { TemplateSelector } from "../inputs/TemplateSelector";
import { FontEditor } from "../inputs/FontEditor";
import { useThemeEditorStore, DEFAULT_FORM_DATA } from "@/lib/stores";
import { useShallow } from "zustand/react/shallow";

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
  const { countdownStyle, countdownFont } = useThemeEditorStore(
    useShallow((s) => ({
      countdownStyle: s.formData.countdownStyle,
      countdownFont: s.formData.countdownFont,
    }))
  );
  const updateCountdownStyle = useThemeEditorStore((s) => s.updateCountdownStyle);
  const updateCountdownFont = useThemeEditorStore((s) => s.updateCountdownFont);
  const resetCountdownFont = useThemeEditorStore((s) => s.resetCountdownFont);

  return (
    <div className="space-y-6">
      <div>
        <TemplateSelector
          label="Countdown Style"
          value={countdownStyle || CountdownStyle.BOLD}
          onChange={updateCountdownStyle}
          options={STYLE_OPTIONS}
        />
      </div>

      <div className="pt-4 border-t">
        <FontEditor
          label="Countdown Font"
          value={countdownFont || DEFAULT_FORM_DATA.countdownFont!}
          onChange={updateCountdownFont}
          onReset={resetCountdownFont}
        />
      </div>
    </div>
  );
}
