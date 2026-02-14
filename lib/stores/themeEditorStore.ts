import { create } from "zustand";
import {
  CreateThemeInput,
  LowerThirdTemplate,
  CountdownStyle,
  FontConfig,
  LowerThirdAnimationTheme,
  ColorScheme,
} from "@/lib/models/Theme";
import { LayoutConfig } from "@/components/theme-editor/inputs/PositionEditor";

export const DEFAULT_FORM_DATA: Partial<CreateThemeInput> = {
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
      avatarBorderColor: "#272727",
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

interface ThemeEditorState {
  formData: Partial<CreateThemeInput>;
  isDirty: boolean;
  enableOBSPreview: boolean;
  _initialData: Partial<CreateThemeInput>;
  _onOBSPreviewUpdate: ((formData: Partial<CreateThemeInput>) => void) | null;
  _updateTimeout: ReturnType<typeof setTimeout> | null;

  // Initialization
  init: (
    initialData?: Partial<CreateThemeInput>,
    onOBSPreviewUpdate?: (formData: Partial<CreateThemeInput>) => void
  ) => void;
  cleanup: () => void;

  // Setters
  setFormData: (data: Partial<CreateThemeInput>) => void;
  setEnableOBSPreview: (enabled: boolean) => void;

  // Update functions
  updateColor: (key: keyof ColorScheme, value: string) => void;
  updateLowerThirdFont: (updates: Partial<FontConfig>) => void;
  updateCountdownFont: (updates: Partial<FontConfig>) => void;
  updateLowerThirdLayout: (updates: Partial<LayoutConfig>) => void;
  updateCountdownLayout: (updates: Partial<LayoutConfig>) => void;
  updatePosterLayout: (updates: Partial<LayoutConfig>) => void;
  updateLowerThirdAnimation: (
    updates: Partial<LowerThirdAnimationTheme>
  ) => void;
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
}

/** Helper to compute dirty state and trigger OBS preview update */
function afterFormUpdate(
  get: () => ThemeEditorState,
  set: (partial: Partial<ThemeEditorState>) => void,
  newFormData: Partial<CreateThemeInput>
) {
  const state = get();
  const isDirty =
    JSON.stringify(newFormData) !== JSON.stringify(state._initialData);
  set({ formData: newFormData, isDirty });

  // Debounced OBS preview update
  if (state.enableOBSPreview && state._onOBSPreviewUpdate) {
    if (state._updateTimeout) {
      clearTimeout(state._updateTimeout);
    }
    const timeout = setTimeout(() => {
      const current = get();
      current._onOBSPreviewUpdate?.(current.formData);
    }, 300);
    set({ _updateTimeout: timeout });
  }
}

export const useThemeEditorStore = create<ThemeEditorState>((set, get) => ({
  formData: DEFAULT_FORM_DATA,
  isDirty: false,
  enableOBSPreview: true,
  _initialData: DEFAULT_FORM_DATA,
  _onOBSPreviewUpdate: null,
  _updateTimeout: null,

  init: (initialData, onOBSPreviewUpdate) => {
    const state = get();
    if (state._updateTimeout) {
      clearTimeout(state._updateTimeout);
    }
    const data = initialData || DEFAULT_FORM_DATA;
    set({
      formData: data,
      _initialData: data,
      isDirty: false,
      enableOBSPreview: true,
      _onOBSPreviewUpdate: onOBSPreviewUpdate ?? null,
      _updateTimeout: null,
    });
  },

  cleanup: () => {
    const state = get();
    if (state._updateTimeout) {
      clearTimeout(state._updateTimeout);
    }
    set({
      formData: DEFAULT_FORM_DATA,
      isDirty: false,
      enableOBSPreview: true,
      _initialData: DEFAULT_FORM_DATA,
      _onOBSPreviewUpdate: null,
      _updateTimeout: null,
    });
  },

  setFormData: (data) => {
    afterFormUpdate(get, set, data);
  },

  setEnableOBSPreview: (enabled) => {
    set({ enableOBSPreview: enabled });
  },

  updateColor: (key, value) => {
    const prev = get().formData;
    const newData = {
      ...prev,
      colors: { ...prev.colors!, [key]: value },
    };
    afterFormUpdate(get, set, newData);
  },

  updateLowerThirdFont: (updates) => {
    const prev = get().formData;
    const newData = {
      ...prev,
      lowerThirdFont: { ...prev.lowerThirdFont!, ...updates },
    };
    afterFormUpdate(get, set, newData);
  },

  updateCountdownFont: (updates) => {
    const prev = get().formData;
    const newData = {
      ...prev,
      countdownFont: { ...prev.countdownFont!, ...updates },
    };
    afterFormUpdate(get, set, newData);
  },

  updateLowerThirdLayout: (updates) => {
    const prev = get().formData;
    const newData = {
      ...prev,
      lowerThirdLayout: { ...prev.lowerThirdLayout!, ...updates },
    };
    afterFormUpdate(get, set, newData);
  },

  updateCountdownLayout: (updates) => {
    const prev = get().formData;
    const newData = {
      ...prev,
      countdownLayout: { ...prev.countdownLayout!, ...updates },
    };
    afterFormUpdate(get, set, newData);
  },

  updatePosterLayout: (updates) => {
    const prev = get().formData;
    const newData = {
      ...prev,
      posterLayout: { ...prev.posterLayout!, ...updates },
    };
    afterFormUpdate(get, set, newData);
  },

  updateLowerThirdAnimation: (updates) => {
    const prev = get().formData;
    const newData = {
      ...prev,
      lowerThirdAnimation: { ...prev.lowerThirdAnimation!, ...updates },
    };
    afterFormUpdate(get, set, newData);
  },

  updateTemplate: (template) => {
    const prev = get().formData;
    const newData = { ...prev, lowerThirdTemplate: template };
    afterFormUpdate(get, set, newData);
  },

  updateCountdownStyle: (style) => {
    const prev = get().formData;
    const newData = { ...prev, countdownStyle: style };
    afterFormUpdate(get, set, newData);
  },

  updateName: (name) => {
    const prev = get().formData;
    const newData = { ...prev, name };
    afterFormUpdate(get, set, newData);
  },

  resetColors: () => {
    const prev = get().formData;
    const newData = { ...prev, colors: DEFAULT_FORM_DATA.colors };
    afterFormUpdate(get, set, newData);
  },

  resetLowerThirdFont: () => {
    const prev = get().formData;
    const newData = {
      ...prev,
      lowerThirdFont: DEFAULT_FORM_DATA.lowerThirdFont,
    };
    afterFormUpdate(get, set, newData);
  },

  resetCountdownFont: () => {
    const prev = get().formData;
    const newData = {
      ...prev,
      countdownFont: DEFAULT_FORM_DATA.countdownFont,
    };
    afterFormUpdate(get, set, newData);
  },

  resetLowerThirdLayout: () => {
    const prev = get().formData;
    const newData = {
      ...prev,
      lowerThirdLayout: DEFAULT_FORM_DATA.lowerThirdLayout,
    };
    afterFormUpdate(get, set, newData);
  },

  resetCountdownLayout: () => {
    const prev = get().formData;
    const newData = {
      ...prev,
      countdownLayout: DEFAULT_FORM_DATA.countdownLayout,
    };
    afterFormUpdate(get, set, newData);
  },

  resetPosterLayout: () => {
    const prev = get().formData;
    const newData = {
      ...prev,
      posterLayout: DEFAULT_FORM_DATA.posterLayout,
    };
    afterFormUpdate(get, set, newData);
  },

  resetAllLayouts: () => {
    const prev = get().formData;
    const newData = {
      ...prev,
      lowerThirdLayout: DEFAULT_FORM_DATA.lowerThirdLayout,
      countdownLayout: DEFAULT_FORM_DATA.countdownLayout,
      posterLayout: DEFAULT_FORM_DATA.posterLayout,
    };
    afterFormUpdate(get, set, newData);
  },
}));
