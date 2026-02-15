"use client";

import { LowerThirdTemplate } from "@/lib/models/Theme";
import { TemplateSelector } from "../inputs/TemplateSelector";
import { FontEditor } from "../inputs/FontEditor";
import { LowerThirdAnimationEditor } from "@/components/assets/LowerThirdAnimationEditor";
import { useThemeEditorStore, DEFAULT_FORM_DATA } from "@/lib/stores";
import { useShallow } from "zustand/react/shallow";

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
  const { lowerThirdTemplate, lowerThirdFont, lowerThirdAnimation, colors } =
    useThemeEditorStore(
      useShallow((s) => ({
        lowerThirdTemplate: s.formData.lowerThirdTemplate,
        lowerThirdFont: s.formData.lowerThirdFont,
        lowerThirdAnimation: s.formData.lowerThirdAnimation,
        colors: s.formData.colors,
      }))
    );
  const updateTemplate = useThemeEditorStore((s) => s.updateTemplate);
  const updateLowerThirdFont = useThemeEditorStore((s) => s.updateLowerThirdFont);
  const updateLowerThirdAnimation = useThemeEditorStore((s) => s.updateLowerThirdAnimation);
  const resetLowerThirdFont = useThemeEditorStore((s) => s.resetLowerThirdFont);

  return (
    <div className="space-y-6">
      <div>
        <TemplateSelector
          label="Lower Third Template"
          value={lowerThirdTemplate || LowerThirdTemplate.CLASSIC}
          onChange={updateTemplate}
          options={TEMPLATE_OPTIONS}
        />
      </div>

      <div className="pt-4 border-t">
        <FontEditor
          label="Lower Third Font"
          value={lowerThirdFont || DEFAULT_FORM_DATA.lowerThirdFont!}
          onChange={updateLowerThirdFont}
          onReset={resetLowerThirdFont}
        />
      </div>

      {lowerThirdAnimation && colors && (
        <div className="pt-4 border-t">
          <LowerThirdAnimationEditor
            value={lowerThirdAnimation}
            themeColors={colors}
            onChange={updateLowerThirdAnimation}
          />
        </div>
      )}
    </div>
  );
}
