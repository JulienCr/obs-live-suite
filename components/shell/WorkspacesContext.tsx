"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/utils/ClientFetch";
import type { DbWorkspaceSummary, DbWorkspace } from "@/lib/models/Database";
import { usePanelColors } from "./PanelColorsContext";

const LAYOUT_KEY = "obs-live-suite-dockview-layout";
const CURRENT_WORKSPACE_KEY = "obs-live-suite-current-workspace";

export interface WorkspacesContextValue {
  workspaces: DbWorkspaceSummary[];
  currentWorkspaceId: string | null;
  isModified: boolean;
  isLoading: boolean;
  isReady: boolean; // Whether the layout applier is registered (we're on dashboard)

  // Apply a workspace (load its layout)
  applyWorkspace: (id: string) => Promise<void>;

  // Save current layout as a new workspace
  saveCurrentAsWorkspace: (name: string, description?: string) => Promise<DbWorkspace>;

  // Save current layout to an existing workspace
  saveToExistingWorkspace: (id: string) => Promise<void>;

  // Reset to the default workspace
  resetToDefault: () => Promise<void>;

  // Set a workspace as default
  setAsDefault: (id: string) => Promise<void>;

  // Delete a workspace
  deleteWorkspace: (id: string) => Promise<void>;

  // Refresh workspace list from API
  refreshWorkspaces: () => Promise<void>;

  // Mark layout as modified (called when layout changes)
  markAsModified: () => void;

  // Get current layout JSON (for saving)
  getCurrentLayoutJson: () => string | null;

  // Set the layout JSON getter (provided by DashboardShell)
  setLayoutJsonGetter: (getter: () => string | null) => void;

  // Set the layout applier (provided by DashboardShell)
  setLayoutApplier: (applier: (layoutJson: string, panelColors: Record<string, string>) => void) => void;
}

const WorkspacesContext = createContext<WorkspacesContextValue | null>(null);

export function useWorkspaces() {
  const context = useContext(WorkspacesContext);
  if (!context) {
    throw new Error("useWorkspaces must be used within a WorkspacesProvider");
  }
  return context;
}

/**
 * Safe version of useWorkspaces that returns null if not within a provider.
 * Use this in components that may be rendered outside the dashboard.
 */
export function useWorkspacesSafe(): WorkspacesContextValue | null {
  return useContext(WorkspacesContext);
}

interface WorkspacesProviderProps {
  children: ReactNode;
}

export function WorkspacesProvider({ children }: WorkspacesProviderProps) {
  const [workspaces, setWorkspaces] = useState<DbWorkspaceSummary[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const layoutJsonGetterRef = useRef<(() => string | null) | null>(null);
  const layoutApplierRef = useRef<((layoutJson: string, panelColors: Record<string, string>) => void) | null>(null);

  // Try to get panel colors context - may not be available
  let panelColorsContext: { colors: Record<string, { scheme: string }>; setScheme: (panelId: any, scheme: any) => Promise<void> } | null = null;
  try {
    panelColorsContext = usePanelColors();
  } catch {
    // Panel colors context not available
  }
  const panelColors = panelColorsContext?.colors ?? {};
  const setScheme = panelColorsContext?.setScheme;

  // Fetch workspaces on mount
  useEffect(() => {
    refreshWorkspaces();

    // Restore current workspace ID from localStorage
    const savedId = localStorage.getItem(CURRENT_WORKSPACE_KEY);
    if (savedId) {
      setCurrentWorkspaceId(savedId);
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiGet<{ workspaces: DbWorkspaceSummary[] }>("/api/workspaces");
      setWorkspaces(data.workspaces);
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyWorkspace = useCallback(
    async (id: string) => {
      if (!layoutApplierRef.current) {
        console.warn("Layout applier not registered, cannot apply workspace");
        return;
      }

      try {
        const data = await apiGet<{ workspace: DbWorkspace }>(`/api/workspaces/${id}`);
        const { layoutJson, panelColors: workspacePanelColors } = data.workspace;

        // Apply the layout
        layoutApplierRef.current(layoutJson, workspacePanelColors);

        // Apply panel colors
        if (setScheme) {
          for (const [panelId, scheme] of Object.entries(workspacePanelColors)) {
            await setScheme(panelId as any, scheme as any);
          }
        }

        // Update state
        setCurrentWorkspaceId(id);
        setIsModified(false);
        localStorage.setItem(CURRENT_WORKSPACE_KEY, id);
      } catch (error) {
        console.error("Failed to apply workspace:", error);
        throw error;
      }
    },
    [setScheme]
  );

  const saveCurrentAsWorkspace = useCallback(
    async (name: string, description?: string): Promise<DbWorkspace> => {
      const layoutJson = layoutJsonGetterRef.current?.();
      if (!layoutJson) {
        throw new Error("No layout available to save");
      }

      // Get current panel colors as a simple record
      const panelColorsRecord: Record<string, string> = {};
      for (const [panelId, entry] of Object.entries(panelColors)) {
        panelColorsRecord[panelId] = entry.scheme;
      }

      const data = await apiPost<{ workspace: DbWorkspace }>("/api/workspaces", {
        name,
        description,
        layoutJson,
        panelColors: panelColorsRecord,
      });

      // Update state
      setCurrentWorkspaceId(data.workspace.id);
      setIsModified(false);
      localStorage.setItem(CURRENT_WORKSPACE_KEY, data.workspace.id);

      // Refresh workspace list
      await refreshWorkspaces();

      return data.workspace;
    },
    [panelColors, refreshWorkspaces]
  );

  const saveToExistingWorkspace = useCallback(
    async (id: string) => {
      const layoutJson = layoutJsonGetterRef.current?.();
      if (!layoutJson) {
        throw new Error("No layout available to save");
      }

      // Get current panel colors as a simple record
      const panelColorsRecord: Record<string, string> = {};
      for (const [panelId, entry] of Object.entries(panelColors)) {
        panelColorsRecord[panelId] = entry.scheme;
      }

      await apiPut(`/api/workspaces/${id}`, {
        layoutJson,
        panelColors: panelColorsRecord,
      });

      // Update state
      setCurrentWorkspaceId(id);
      setIsModified(false);
      localStorage.setItem(CURRENT_WORKSPACE_KEY, id);

      // Refresh workspace list
      await refreshWorkspaces();
    },
    [panelColors, refreshWorkspaces]
  );

  const resetToDefault = useCallback(async () => {
    // Find the default workspace
    const defaultWorkspace = workspaces.find((w) => w.isDefault);
    if (defaultWorkspace) {
      await applyWorkspace(defaultWorkspace.id);
    } else if (workspaces.length > 0) {
      // Fallback to first workspace
      await applyWorkspace(workspaces[0].id);
    }
  }, [workspaces, applyWorkspace]);

  const setAsDefault = useCallback(
    async (id: string) => {
      await apiPost(`/api/workspaces/${id}/default`, {});
      await refreshWorkspaces();
    },
    [refreshWorkspaces]
  );

  const deleteWorkspace = useCallback(
    async (id: string) => {
      await apiDelete(`/api/workspaces/${id}`);

      // If we deleted the current workspace, clear the selection
      if (currentWorkspaceId === id) {
        setCurrentWorkspaceId(null);
        localStorage.removeItem(CURRENT_WORKSPACE_KEY);
      }

      await refreshWorkspaces();
    },
    [currentWorkspaceId, refreshWorkspaces]
  );

  const markAsModified = useCallback(() => {
    setIsModified(true);
  }, []);

  const getCurrentLayoutJson = useCallback(() => {
    return layoutJsonGetterRef.current?.() ?? null;
  }, []);

  const setLayoutJsonGetter = useCallback((getter: () => string | null) => {
    layoutJsonGetterRef.current = getter;
  }, []);

  const setLayoutApplier = useCallback((applier: (layoutJson: string, panelColors: Record<string, string>) => void) => {
    layoutApplierRef.current = applier;
    setIsReady(true);
  }, []);

  return (
    <WorkspacesContext.Provider
      value={{
        workspaces,
        currentWorkspaceId,
        isModified,
        isLoading,
        isReady,
        applyWorkspace,
        saveCurrentAsWorkspace,
        saveToExistingWorkspace,
        resetToDefault,
        setAsDefault,
        deleteWorkspace,
        refreshWorkspaces,
        markAsModified,
        getCurrentLayoutJson,
        setLayoutJsonGetter,
        setLayoutApplier,
      }}
    >
      {children}
    </WorkspacesContext.Provider>
  );
}
