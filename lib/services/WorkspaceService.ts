import { Logger } from "@/lib/utils/Logger";
import { WorkspaceRepository } from "@/lib/repositories/WorkspaceRepository";
import type {
  DbWorkspace,
  DbWorkspaceInput,
  DbWorkspaceUpdate,
  DbWorkspaceSummary,
} from "@/lib/models/Database";

// Built-in workspace IDs
export const WORKSPACE_IDS = {
  DEFAULT: "workspace-default-regie",
  LIVE: "workspace-builtin-live",
  PREP: "workspace-builtin-prep",
  MINIMAL: "workspace-builtin-minimal",
} as const;

// User's default workspace layout (Régie)
const DEFAULT_WORKSPACE_LAYOUT = JSON.stringify({
  grid: {
    root: {
      type: "branch",
      data: [
        {
          type: "leaf",
          data: { views: ["regiePublicChat"], activeView: "regiePublicChat", id: "2" },
          size: 547,
        },
        {
          type: "branch",
          data: [
            {
              type: "leaf",
              data: { views: ["regieInternalChat"], activeView: "regieInternalChat", id: "4" },
              size: 647,
            },
            {
              type: "leaf",
              data: {
                views: ["regieInternalChatView"],
                activeView: "regieInternalChatView",
                id: "5",
              },
              size: 648,
            },
          ],
          size: 707,
        },
        { type: "leaf", data: { views: ["poster"], activeView: "poster", id: "9" }, size: 627 },
        {
          type: "branch",
          data: [
            { type: "leaf", data: { views: ["twitch"], activeView: "twitch", id: "1" }, size: 431 },
            { type: "leaf", data: { views: ["guests"], activeView: "guests", id: "12" }, size: 431 },
            {
              type: "leaf",
              data: { views: ["lowerThird"], activeView: "lowerThird", id: "11" },
              size: 433,
            },
          ],
          size: 629,
        },
      ],
      size: 1295,
    },
    width: 2510,
    height: 1295,
    orientation: "HORIZONTAL",
  },
  panels: {
    regieInternalChat: {
      id: "regieInternalChat",
      contentComponent: "regieInternalChat",
      tabComponent: "props.defaultTabComponent",
      title: "Chat interne régie",
    },
    regieInternalChatView: {
      id: "regieInternalChatView",
      contentComponent: "regieInternalChatView",
      tabComponent: "props.defaultTabComponent",
      title: "Vue chat interne",
    },
    guests: {
      id: "guests",
      contentComponent: "guests",
      tabComponent: "props.defaultTabComponent",
      title: "Invités",
    },
    lowerThird: {
      id: "lowerThird",
      contentComponent: "lowerThird",
      tabComponent: "props.defaultTabComponent",
      title: "Synthés",
    },
    poster: {
      id: "poster",
      contentComponent: "poster",
      tabComponent: "props.defaultTabComponent",
      title: "Affiche",
    },
    twitch: {
      id: "twitch",
      contentComponent: "twitch",
      tabComponent: "props.defaultTabComponent",
      title: "Twitch",
    },
    regiePublicChat: {
      id: "regiePublicChat",
      contentComponent: "regiePublicChat",
      tabComponent: "props.defaultTabComponent",
      title: "Chat public régie",
    },
  },
  activeGroup: "2",
});

// Live preset layout (tabbed widgets + bottom macros)
const LIVE_WORKSPACE_LAYOUT = JSON.stringify({
  grid: {
    root: {
      type: "branch",
      data: [
        {
          type: "leaf",
          data: {
            views: ["lowerThird", "countdown", "guests", "poster"],
            activeView: "lowerThird",
            id: "1",
          },
          size: 800,
        },
        {
          type: "leaf",
          data: { views: ["macros", "eventLog"], activeView: "macros", id: "2" },
          size: 250,
        },
      ],
      size: 1050,
    },
    width: 1920,
    height: 1050,
    orientation: "VERTICAL",
  },
  panels: {
    lowerThird: {
      id: "lowerThird",
      contentComponent: "lowerThird",
      tabComponent: "props.defaultTabComponent",
      title: "Synthés",
    },
    countdown: {
      id: "countdown",
      contentComponent: "countdown",
      tabComponent: "props.defaultTabComponent",
      title: "Compte à rebours",
    },
    guests: {
      id: "guests",
      contentComponent: "guests",
      tabComponent: "props.defaultTabComponent",
      title: "Invités",
    },
    poster: {
      id: "poster",
      contentComponent: "poster",
      tabComponent: "props.defaultTabComponent",
      title: "Affiche",
    },
    macros: {
      id: "macros",
      contentComponent: "macros",
      tabComponent: "props.defaultTabComponent",
      title: "Macros",
    },
    eventLog: {
      id: "eventLog",
      contentComponent: "eventLog",
      tabComponent: "props.defaultTabComponent",
      title: "Journal",
    },
  },
  activeGroup: "1",
});

// Prep preset layout (grid layout - all panels visible)
const PREP_WORKSPACE_LAYOUT = JSON.stringify({
  grid: {
    root: {
      type: "branch",
      data: [
        {
          type: "branch",
          data: [
            {
              type: "leaf",
              data: { views: ["lowerThird"], activeView: "lowerThird", id: "1" },
              size: 640,
            },
            {
              type: "leaf",
              data: { views: ["countdown"], activeView: "countdown", id: "2" },
              size: 640,
            },
            { type: "leaf", data: { views: ["guests"], activeView: "guests", id: "3" }, size: 640 },
          ],
          size: 525,
        },
        {
          type: "branch",
          data: [
            { type: "leaf", data: { views: ["poster"], activeView: "poster", id: "4" }, size: 640 },
            { type: "leaf", data: { views: ["macros"], activeView: "macros", id: "5" }, size: 640 },
            {
              type: "leaf",
              data: { views: ["eventLog"], activeView: "eventLog", id: "6" },
              size: 640,
            },
          ],
          size: 525,
        },
      ],
      size: 1050,
    },
    width: 1920,
    height: 1050,
    orientation: "VERTICAL",
  },
  panels: {
    lowerThird: {
      id: "lowerThird",
      contentComponent: "lowerThird",
      tabComponent: "props.defaultTabComponent",
      title: "Synthés",
    },
    countdown: {
      id: "countdown",
      contentComponent: "countdown",
      tabComponent: "props.defaultTabComponent",
      title: "Compte à rebours",
    },
    guests: {
      id: "guests",
      contentComponent: "guests",
      tabComponent: "props.defaultTabComponent",
      title: "Invités",
    },
    poster: {
      id: "poster",
      contentComponent: "poster",
      tabComponent: "props.defaultTabComponent",
      title: "Affiche",
    },
    macros: {
      id: "macros",
      contentComponent: "macros",
      tabComponent: "props.defaultTabComponent",
      title: "Macros",
    },
    eventLog: {
      id: "eventLog",
      contentComponent: "eventLog",
      tabComponent: "props.defaultTabComponent",
      title: "Journal",
    },
  },
  activeGroup: "1",
});

// Minimal preset layout (just lower third + macros)
const MINIMAL_WORKSPACE_LAYOUT = JSON.stringify({
  grid: {
    root: {
      type: "branch",
      data: [
        {
          type: "leaf",
          data: { views: ["lowerThird"], activeView: "lowerThird", id: "1" },
          size: 850,
        },
        { type: "leaf", data: { views: ["macros"], activeView: "macros", id: "2" }, size: 200 },
      ],
      size: 1050,
    },
    width: 1920,
    height: 1050,
    orientation: "VERTICAL",
  },
  panels: {
    lowerThird: {
      id: "lowerThird",
      contentComponent: "lowerThird",
      tabComponent: "props.defaultTabComponent",
      title: "Synthés",
    },
    macros: {
      id: "macros",
      contentComponent: "macros",
      tabComponent: "props.defaultTabComponent",
      title: "Macros",
    },
  },
  activeGroup: "1",
});

/**
 * WorkspaceService handles workspace business logic
 */
export class WorkspaceService {
  private static instance: WorkspaceService;
  private repository: WorkspaceRepository;
  private logger: Logger;

  private constructor() {
    this.repository = WorkspaceRepository.getInstance();
    this.logger = new Logger("WorkspaceService");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService();
    }
    return WorkspaceService.instance;
  }

  /**
   * Get all workspaces
   */
  getAllWorkspaces(): DbWorkspace[] {
    return this.repository.getAll();
  }

  /**
   * Get workspace summaries (for dropdowns, without heavy layoutJson)
   */
  getWorkspaceSummaries(): DbWorkspaceSummary[] {
    return this.repository.getAllSummaries();
  }

  /**
   * Get workspace by ID
   */
  getWorkspaceById(id: string): DbWorkspace | null {
    return this.repository.getById(id);
  }

  /**
   * Get the default workspace
   */
  getDefaultWorkspace(): DbWorkspace | null {
    return this.repository.getDefault();
  }

  /**
   * Create a new workspace from current layout
   */
  createFromCurrentLayout(
    name: string,
    description: string | null,
    layoutJson: string,
    panelColors: Record<string, string>
  ): DbWorkspace {
    const id = crypto.randomUUID();
    const sortOrder = this.repository.getNextSortOrder();

    const workspace: DbWorkspaceInput = {
      id,
      name,
      description,
      layoutJson,
      panelColors,
      isDefault: false,
      isBuiltIn: false,
      sortOrder,
    };

    this.repository.create(workspace);
    return this.repository.getById(id)!;
  }

  /**
   * Update workspace layout
   */
  updateWorkspaceLayout(
    id: string,
    layoutJson: string,
    panelColors: Record<string, string>
  ): void {
    this.repository.update(id, { layoutJson, panelColors });
  }

  /**
   * Update workspace metadata (name, description)
   */
  updateWorkspaceMetadata(
    id: string,
    updates: { name?: string; description?: string }
  ): void {
    this.repository.update(id, updates);
  }

  /**
   * Delete a workspace
   */
  deleteWorkspace(id: string): void {
    this.repository.delete(id);
  }

  /**
   * Set workspace as default
   */
  setAsDefault(id: string): void {
    this.repository.setDefault(id);
  }

  /**
   * Reorder workspaces
   */
  reorderWorkspaces(ids: string[]): void {
    this.repository.reorder(ids);
  }

  /**
   * Check if a workspace name is already taken
   */
  isNameTaken(name: string): boolean {
    return this.repository.existsByName(name);
  }

  /**
   * Initialize built-in workspaces on first run
   * Should be called during server initialization
   */
  initializeBuiltInWorkspaces(): void {
    // Check if built-in workspaces already exist
    const existing = this.repository.getBuiltIn();
    if (existing.length > 0) {
      this.logger.info("Built-in workspaces already exist, skipping initialization");
      return;
    }

    this.logger.info("Initializing built-in workspaces...");

    // Create the user's default workspace (Régie) - this is THE default
    this.repository.create({
      id: WORKSPACE_IDS.DEFAULT,
      name: "Régie",
      description: "Espace de travail par défaut avec chat et contrôles",
      layoutJson: DEFAULT_WORKSPACE_LAYOUT,
      panelColors: {},
      isDefault: true,
      isBuiltIn: true,
      sortOrder: 0,
    });

    // Create Live preset
    this.repository.create({
      id: WORKSPACE_IDS.LIVE,
      name: "Live",
      description: "Widgets en onglets avec macros en bas",
      layoutJson: LIVE_WORKSPACE_LAYOUT,
      panelColors: {},
      isDefault: false,
      isBuiltIn: true,
      sortOrder: 1,
    });

    // Create Prep preset
    this.repository.create({
      id: WORKSPACE_IDS.PREP,
      name: "Préparation",
      description: "Tous les panneaux visibles en grille",
      layoutJson: PREP_WORKSPACE_LAYOUT,
      panelColors: {},
      isDefault: false,
      isBuiltIn: true,
      sortOrder: 2,
    });

    // Create Minimal preset
    this.repository.create({
      id: WORKSPACE_IDS.MINIMAL,
      name: "Minimal",
      description: "Synthé et macros uniquement",
      layoutJson: MINIMAL_WORKSPACE_LAYOUT,
      panelColors: {},
      isDefault: false,
      isBuiltIn: true,
      sortOrder: 3,
    });

    this.logger.info("Built-in workspaces initialized successfully");
  }
}
