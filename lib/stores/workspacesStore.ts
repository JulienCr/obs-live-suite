import { create } from "zustand";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/utils/ClientFetch";
import type { DbWorkspaceSummary, DbWorkspace } from "@/lib/models/Database";
import type { PanelId, ColorScheme } from "@/lib/models/PanelColor";
import { PANEL_IDS, COLOR_SCHEMES } from "@/lib/models/PanelColor";
import { usePanelColorsStore } from "./panelColorsStore";

const LAYOUT_KEY = "obs-live-suite-dockview-layout";
const CURRENT_WORKSPACE_KEY = "obs-live-suite-current-workspace";

interface WorkspacesState {
  workspaces: DbWorkspaceSummary[];
  currentWorkspaceId: string | null;
  isModified: boolean;
  isLoading: boolean;
  isReady: boolean;

  _layoutJsonGetter: (() => string | null) | null;
  _layoutApplier:
    | ((layoutJson: string, panelColors: Record<string, string>) => void)
    | null;

  // Actions
  init: () => void;
  refreshWorkspaces: () => Promise<void>;
  applyWorkspace: (id: string) => Promise<void>;
  saveCurrentAsWorkspace: (
    name: string,
    description?: string
  ) => Promise<DbWorkspace>;
  saveToExistingWorkspace: (id: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
  setAsDefault: (id: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  markAsModified: () => void;
  getCurrentLayoutJson: () => string | null;
  setLayoutJsonGetter: (getter: () => string | null) => void;
  setLayoutApplier: (
    applier: (layoutJson: string, panelColors: Record<string, string>) => void
  ) => void;
}

/** Helper to convert panel colors store format to simple record */
function getPanelColorsRecord(): Record<string, string> {
  const colors = usePanelColorsStore.getState().colors;
  const record: Record<string, string> = {};
  for (const [panelId, entry] of Object.entries(colors)) {
    record[panelId] = entry.scheme;
  }
  return record;
}

export const useWorkspacesStore = create<WorkspacesState>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: null,
  isModified: false,
  isLoading: true,
  isReady: false,
  _layoutJsonGetter: null,
  _layoutApplier: null,

  init: () => {
    // Restore current workspace ID from localStorage
    const savedId = localStorage.getItem(CURRENT_WORKSPACE_KEY);
    if (savedId) {
      set({ currentWorkspaceId: savedId });
    }
    get().refreshWorkspaces();
  },

  refreshWorkspaces: async () => {
    try {
      set({ isLoading: true });
      const data = await apiGet<{ workspaces: DbWorkspaceSummary[] }>(
        "/api/workspaces"
      );
      set({ workspaces: data.workspaces });
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  applyWorkspace: async (id: string) => {
    const state = get();
    if (!state._layoutApplier) {
      console.warn(
        "Layout applier not registered, cannot apply workspace"
      );
      return;
    }

    try {
      const data = await apiGet<{ workspace: DbWorkspace }>(
        `/api/workspaces/${id}`
      );
      const { layoutJson, panelColors: workspacePanelColors } =
        data.workspace;

      // Apply the layout
      state._layoutApplier(layoutJson, workspacePanelColors);

      // Apply panel colors via direct store access (not hook)
      const setScheme = usePanelColorsStore.getState().setScheme;
      for (const [panelId, scheme] of Object.entries(
        workspacePanelColors
      )) {
        if (
          (PANEL_IDS as readonly string[]).includes(panelId) &&
          (COLOR_SCHEMES as readonly string[]).includes(scheme)
        ) {
          await setScheme(panelId as PanelId, scheme as ColorScheme);
        }
      }

      // Update state
      set({ currentWorkspaceId: id, isModified: false });
      localStorage.setItem(CURRENT_WORKSPACE_KEY, id);
    } catch (error) {
      console.error("Failed to apply workspace:", error);
      throw error;
    }
  },

  saveCurrentAsWorkspace: async (
    name: string,
    description?: string
  ): Promise<DbWorkspace> => {
    const layoutJson = get()._layoutJsonGetter?.();
    if (!layoutJson) {
      throw new Error("No layout available to save");
    }
    const panelColorsRecord = getPanelColorsRecord();

    const data = await apiPost<{ workspace: DbWorkspace }>(
      "/api/workspaces",
      {
        name,
        description,
        layoutJson,
        panelColors: panelColorsRecord,
      }
    );

    set({ currentWorkspaceId: data.workspace.id, isModified: false });
    localStorage.setItem(CURRENT_WORKSPACE_KEY, data.workspace.id);
    await get().refreshWorkspaces();

    return data.workspace;
  },

  saveToExistingWorkspace: async (id: string) => {
    const layoutJson = get()._layoutJsonGetter?.();
    if (!layoutJson) {
      throw new Error("No layout available to save");
    }
    const panelColorsRecord = getPanelColorsRecord();

    await apiPut(`/api/workspaces/${id}`, {
      layoutJson,
      panelColors: panelColorsRecord,
    });

    set({ currentWorkspaceId: id, isModified: false });
    localStorage.setItem(CURRENT_WORKSPACE_KEY, id);
    await get().refreshWorkspaces();
  },

  resetToDefault: async () => {
    const { workspaces, applyWorkspace } = get();
    const defaultWorkspace = workspaces.find((w) => w.isDefault);
    if (defaultWorkspace) {
      await applyWorkspace(defaultWorkspace.id);
    } else if (workspaces.length > 0) {
      await applyWorkspace(workspaces[0].id);
    }
  },

  setAsDefault: async (id: string) => {
    await apiPost(`/api/workspaces/${id}/default`, {});
    await get().refreshWorkspaces();
  },

  deleteWorkspace: async (id: string) => {
    await apiDelete(`/api/workspaces/${id}`);

    const state = get();
    if (state.currentWorkspaceId === id) {
      set({ currentWorkspaceId: null });
      localStorage.removeItem(CURRENT_WORKSPACE_KEY);
    }

    await get().refreshWorkspaces();
  },

  markAsModified: () => {
    set({ isModified: true });
  },

  getCurrentLayoutJson: () => {
    return get()._layoutJsonGetter?.() ?? null;
  },

  setLayoutJsonGetter: (getter) => {
    set({ _layoutJsonGetter: getter });
  },

  setLayoutApplier: (applier) => {
    set({ _layoutApplier: applier, isReady: true });
  },
}));
