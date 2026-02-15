import { create } from "zustand";
import {
  CreateThemeInput,
  LowerThirdTemplate,
  CountdownStyle,
  FontConfig,
  LowerThirdAnimationTheme,
  ColorScheme,
} from "@/lib/models/Theme";
import type { LayoutConfig } from "@/components/theme-editor/inputs/PositionEditor";

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
): void {
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
      if (current.enableOBSPreview) {
        current._onOBSPreviewUpdate?.(current.formData);
      }
    }, 300);
    set({ _updateTimeout: timeout });
  }
}

/** Clear any pending timeout before resetting state */
function clearPendingTimeout(get: () => ThemeEditorState): void {
  const state = get();
  if (state._updateTimeout) {
    clearTimeout(state._updateTimeout);
  }
}

/** Merge a partial update into a nested formData field and trigger afterFormUpdate */
function mergeField<K extends keyof CreateThemeInput>(
  get: () => ThemeEditorState,
  set: (partial: Partial<ThemeEditorState>) => void,
  key: K,
  updates: Partial<NonNullable<CreateThemeInput[K]>>
): void {
  const prev = get().formData;
  const current = prev[key] as Record<string, unknown> | undefined;
  afterFormUpdate(get, set, { ...prev, [key]: { ...current, ...updates } });
}

/** Reset one or more formData fields to their DEFAULT_FORM_DATA values */
function resetFields(
  get: () => ThemeEditorState,
  set: (partial: Partial<ThemeEditorState>) => void,
  ...keys: (keyof CreateThemeInput)[]
): void {
  const prev = get().formData;
  const resets: Partial<CreateThemeInput> = {};
  for (const key of keys) {
    (resets as Record<string, unknown>)[key] = DEFAULT_FORM_DATA[key];
  }
  afterFormUpdate(get, set, { ...prev, ...resets });
}

export const useThemeEditorStore = create<ThemeEditorState>((set, get) => ({
  formData: DEFAULT_FORM_DATA,
  isDirty: false,
  enableOBSPreview: true,
  _initialData: DEFAULT_FORM_DATA,
  _onOBSPreviewUpdate: null,
  _updateTimeout: null,

  init: (initialData, onOBSPreviewUpdate) => {
    clearPendingTimeout(get);
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
    clearPendingTimeout(get);
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
    if (!enabled) {
      clearPendingTimeout(get);
      set({ enableOBSPreview: false, _updateTimeout: null });
    } else {
      set({ enableOBSPreview: true });
    }
  },

  updateColor: (key, value) => {
    const prev = get().formData;
    afterFormUpdate(get, set, {
      ...prev,
      colors: { ...prev.colors!, [key]: value },
    });
  },

  updateLowerThirdFont: (updates) => mergeField(get, set, "lowerThirdFont", updates),
  updateCountdownFont: (updates) => mergeField(get, set, "countdownFont", updates),
  updateLowerThirdLayout: (updates) => mergeField(get, set, "lowerThirdLayout", updates),
  updateCountdownLayout: (updates) => mergeField(get, set, "countdownLayout", updates),
  updatePosterLayout: (updates) => mergeField(get, set, "posterLayout", updates),
  updateLowerThirdAnimation: (updates) => mergeField(get, set, "lowerThirdAnimation", updates),

  updateTemplate: (template) => {
    afterFormUpdate(get, set, { ...get().formData, lowerThirdTemplate: template });
  },

  updateCountdownStyle: (style) => {
    afterFormUpdate(get, set, { ...get().formData, countdownStyle: style });
  },

  updateName: (name) => {
    afterFormUpdate(get, set, { ...get().formData, name });
  },

  resetColors: () => resetFields(get, set, "colors"),
  resetLowerThirdFont: () => resetFields(get, set, "lowerThirdFont"),
  resetCountdownFont: () => resetFields(get, set, "countdownFont"),
  resetLowerThirdLayout: () => resetFields(get, set, "lowerThirdLayout"),
  resetCountdownLayout: () => resetFields(get, set, "countdownLayout"),
  resetPosterLayout: () => resetFields(get, set, "posterLayout"),
  resetAllLayouts: () => resetFields(get, set, "lowerThirdLayout", "countdownLayout", "posterLayout"),
}));
