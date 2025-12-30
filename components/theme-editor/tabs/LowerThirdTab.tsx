"use client";

import { LowerThirdTemplate } from "@/lib/models/Theme";
import { TemplateSelector } from "../inputs/TemplateSelector";
import { FontEditor } from "../inputs/FontEditor";
import { LowerThirdAnimationEditor } from "@/components/assets/LowerThirdAnimationEditor";
import { useThemeEditor } from "../ThemeEditorContext";

const TEMPLATE_OPTIONS = [
  {
    value: LowerThirdTemplate.CLASSIC,
    label: "Classic",
    description: "Traditional layout with avatar",
  },
  {
    value: LowerThirdTemplate.BAR,
    label: "Bar",
    description: "Horizontal bar style",
  },
  {
    value: LowerThirdTemplate.CARD,
    label: "Card",
    description: "Card-based design",
  },
  {
    value: LowerThirdTemplate.SLIDE,
    label: "Slide",
    description: "Slide-in animation",
  },
];

/**
 * Lower Third tab for theme editor
 */
export function LowerThirdTab() {
  const {
    formData,
    updateTemplate,
    updateLowerThirdFont,
    updateLowerThirdAnimation,
    resetLowerThirdFont,
  } = useThemeEditor();

  return (
    <div className="space-y-6">
      <div>
        <TemplateSelector
          label="Lower Third Template"
          value={formData.lowerThirdTemplate || LowerThirdTemplate.CLASSIC}
          onChange={updateTemplate}
          options={TEMPLATE_OPTIONS}
        />
      </div>

      <div className="pt-4 border-t">
        <FontEditor
          label="Lower Third Font"
          value={formData.lowerThirdFont || { family: "Inter, sans-serif", size: 28, weight: 700 }}
          onChange={(font) => updateLowerThirdFont(font)}
          onReset={resetLowerThirdFont}
        />
      </div>

      {formData.lowerThirdAnimation && formData.colors && (
        <div className="pt-4 border-t">
          <LowerThirdAnimationEditor
            value={formData.lowerThirdAnimation}
            themeColors={formData.colors}
            onChange={updateLowerThirdAnimation}
          />
        </div>
      )}
    </div>
  );
}
