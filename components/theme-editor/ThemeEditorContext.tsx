"use client";

import { createContext, useContext, useState, ReactNode, useRef, useEffect } from "react";
import {
  CreateThemeInput,
  LowerThirdTemplate,
  CountdownStyle,
  FontConfig,
  LowerThirdAnimationTheme,
  ColorScheme,
} from "@/lib/models/Theme";
import { LayoutConfig } from "./inputs/PositionEditor";

const DEFAULT_FORM_DATA: Partial<CreateThemeInput> = {
  name: "",
  colors: {
    primary: "#3B82F6",
    accent: "#60A5FA",
    surface: "#1E293B",
    text: "#F8FAFC",
    success: "#10B981",
    warn: "#F59E0B",
  },
  lowerThirdTemplate: LowerThirdTemplate.CLASSIC,
  lowerThirdFont: {
    family: "Inter, sans-serif",
    size: 28,
    weight: 700,
  },
  lowerThirdLayout: { x: 60, y: 920, scale: 1 },
  lowerThirdAnimation: {
    timing: {
      logoFadeDuration: 200,
      logoScaleDuration: 200,
      flipDuration: 600,
      flipDelay: 500,
      barAppearDelay: 800,
      barExpandDuration: 450,
      textAppearDelay: 1000,
      textFadeDuration: 250,
    },
    styles: {
      barBorderRadius: 16,
      barMinWidth: 200,
      avatarBorderWidth: 4,
      avatarBorderColor: '#272727',
      freeTextMaxWidth: {
        left: 65,
        right: 65,
        center: 90,
      },
    },
  },
  countdownStyle: CountdownStyle.BOLD,
  countdownFont: {
    family: "Courier New, monospace",
    size: 80,
    weight: 900,
  },
  countdownLayout: { x: 960, y: 540, scale: 1 },
  posterLayout: { x: 960, y: 540, scale: 1 },
  isGlobal: false,
};

interface ThemeEditorContextValue {
  formData: Partial<CreateThemeInput>;
  setFormData: (data: Partial<CreateThemeInput>) => void;

  // Update functions
  updateColor: (key: keyof ColorScheme, value: string) => void;
  updateLowerThirdFont: (updates: Partial<FontConfig>) => void;
  updateCountdownFont: (updates: Partial<FontConfig>) => void;
  updateLowerThirdLayout: (updates: Partial<LayoutConfig>) => void;
  updateCountdownLayout: (updates: Partial<LayoutConfig>) => void;
  updatePosterLayout: (updates: Partial<LayoutConfig>) => void;
  updateLowerThirdAnimation: (updates: Partial<LowerThirdAnimationTheme>) => void;
  updateTemplate: (template: LowerThirdTemplate) => void;
  updateCountdownStyle: (style: CountdownStyle) => void;
  updateName: (name: string) => void;

  // Reset functions
  resetColors: () => void;
  resetLowerThirdFont: () => void;
  resetCountdownFont: () => void;
  resetLowerThirdLayout: () => void;
  resetCountdownLayout: () => void;
  resetPosterLayout: () => void;
  resetAllLayouts: () => void;

  // State flags
  isDirty: boolean;
  enableOBSPreview: boolean;
  setEnableOBSPreview: (enabled: boolean) => void;
}

const ThemeEditorContext = createContext<ThemeEditorContextValue | null>(null);

export function useThemeEditor() {
  const context = useContext(ThemeEditorContext);
  if (!context) {
    throw new Error("useThemeEditor must be used within ThemeEditorProvider");
  }
  return context;
}

interface ThemeEditorProviderProps {
  children: ReactNode;
  initialData?: Partial<CreateThemeInput>;
  onOBSPreviewUpdate?: (formData: Partial<CreateThemeInput>) => void;
}

export function ThemeEditorProvider({
  children,
  initialData,
  onOBSPreviewUpdate,
}: ThemeEditorProviderProps) {
  const [formData, setFormData] = useState<Partial<CreateThemeInput>>(
    initialData || DEFAULT_FORM_DATA
  );
  const [isDirty, setIsDirty] = useState(false);
  const [enableOBSPreview, setEnableOBSPreview] = useState(true);
  const initialDataRef = useRef(initialData || DEFAULT_FORM_DATA);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track dirty state
  useEffect(() => {
    setIsDirty(JSON.stringify(formData) !== JSON.stringify(initialDataRef.current));
  }, [formData]);

  // OBS Preview update with debounce
  useEffect(() => {
    if (!enableOBSPreview || !onOBSPreviewUpdate) return;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      onOBSPreviewUpdate(formData);
    }, 300);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [formData, enableOBSPreview, onOBSPreviewUpdate]);

  const updateColor = (key: keyof ColorScheme, value: string) => {
    setFormData((prev) => ({
      ...prev,
      colors: { ...prev.colors!, [key]: value },
    }));
  };

  const updateLowerThirdFont = (updates: Partial<FontConfig>) => {
    setFormData((prev) => ({
      ...prev,
      lowerThirdFont: { ...prev.lowerThirdFont!, ...updates },
    }));
  };

  const updateCountdownFont = (updates: Partial<FontConfig>) => {
    setFormData((prev) => ({
      ...prev,
      countdownFont: { ...prev.countdownFont!, ...updates },
    }));
  };

  const updateLowerThirdLayout = (updates: Partial<LayoutConfig>) => {
    setFormData((prev) => ({
      ...prev,
      lowerThirdLayout: { ...prev.lowerThirdLayout!, ...updates },
    }));
  };

  const updateCountdownLayout = (updates: Partial<LayoutConfig>) => {
    setFormData((prev) => ({
      ...prev,
      countdownLayout: { ...prev.countdownLayout!, ...updates },
    }));
  };

  const updatePosterLayout = (updates: Partial<LayoutConfig>) => {
    setFormData((prev) => ({
      ...prev,
      posterLayout: { ...prev.posterLayout!, ...updates },
    }));
  };

  const updateLowerThirdAnimation = (updates: Partial<LowerThirdAnimationTheme>) => {
    setFormData((prev) => ({
      ...prev,
      lowerThirdAnimation: { ...prev.lowerThirdAnimation!, ...updates },
    }));
  };

  const updateTemplate = (template: LowerThirdTemplate) => {
    setFormData((prev) => ({ ...prev, lowerThirdTemplate: template }));
  };

  const updateCountdownStyle = (style: CountdownStyle) => {
    setFormData((prev) => ({ ...prev, countdownStyle: style }));
  };

  const updateName = (name: string) => {
    setFormData((prev) => ({ ...prev, name }));
  };

  const resetColors = () => {
    setFormData((prev) => ({
      ...prev,
      colors: DEFAULT_FORM_DATA.colors,
    }));
  };

  const resetLowerThirdFont = () => {
    setFormData((prev) => ({
      ...prev,
      lowerThirdFont: DEFAULT_FORM_DATA.lowerThirdFont,
    }));
  };

  const resetCountdownFont = () => {
    setFormData((prev) => ({
      ...prev,
      countdownFont: DEFAULT_FORM_DATA.countdownFont,
    }));
  };

  const resetLowerThirdLayout = () => {
    setFormData((prev) => ({
      ...prev,
      lowerThirdLayout: DEFAULT_FORM_DATA.lowerThirdLayout,
    }));
  };

  const resetCountdownLayout = () => {
    setFormData((prev) => ({
      ...prev,
      countdownLayout: DEFAULT_FORM_DATA.countdownLayout,
    }));
  };

  const resetPosterLayout = () => {
    setFormData((prev) => ({
      ...prev,
      posterLayout: DEFAULT_FORM_DATA.posterLayout,
    }));
  };

  const resetAllLayouts = () => {
    setFormData((prev) => ({
      ...prev,
      lowerThirdLayout: DEFAULT_FORM_DATA.lowerThirdLayout,
      countdownLayout: DEFAULT_FORM_DATA.countdownLayout,
      posterLayout: DEFAULT_FORM_DATA.posterLayout,
    }));
  };

  const value: ThemeEditorContextValue = {
    formData,
    setFormData,
    updateColor,
    updateLowerThirdFont,
    updateCountdownFont,
    updateLowerThirdLayout,
    updateCountdownLayout,
    updatePosterLayout,
    updateLowerThirdAnimation,
    updateTemplate,
    updateCountdownStyle,
    updateName,
    resetColors,
    resetLowerThirdFont,
    resetCountdownFont,
    resetLowerThirdLayout,
    resetCountdownLayout,
    resetPosterLayout,
    resetAllLayouts,
    isDirty,
    enableOBSPreview,
    setEnableOBSPreview,
  };

  return (
    <ThemeEditorContext.Provider value={value}>
      {children}
    </ThemeEditorContext.Provider>
  );
}
