import { DatabaseService } from "@/lib/services/DatabaseService";
import { Logger } from "@/lib/utils/Logger";
import { safeJsonParse } from "@/lib/utils/safeJsonParse";
import type {
  DbWorkspace,
  DbWorkspaceInput,
  DbWorkspaceUpdate,
  DbWorkspaceSummary,
} from "@/lib/models/Database";

/**
 * Raw workspace row from SQLite (before type transformation)
 */
type DbWorkspaceRow = Omit<
  DbWorkspace,
  "panelColors" | "isDefault" | "isBuiltIn" | "createdAt" | "updatedAt"
> & {
  panelColors: string;
  isDefault: number;
  isBuiltIn: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Raw workspace summary row from SQLite
 */
type DbWorkspaceSummaryRow = Omit<DbWorkspaceSummary, "isDefault" | "isBuiltIn"> & {
  isDefault: number;
  isBuiltIn: number;
};

/**
 * WorkspaceRepository handles all workspace-related database operations
 */
export class WorkspaceRepository {
  private static instance: WorkspaceRepository;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger("WorkspaceRepository");
  }

  static getInstance(): WorkspaceRepository {
    if (!WorkspaceRepository.instance) {
      WorkspaceRepository.instance = new WorkspaceRepository();
    }
    return WorkspaceRepository.instance;
  }

  private get db() {
    return DatabaseService.getInstance().getDb();
  }

  private transformRow(row: DbWorkspaceRow): DbWorkspace {
    return {
      ...row,
      panelColors: safeJsonParse<Record<string, string>>(row.panelColors, {}),
      isDefault: Boolean(row.isDefault),
      isBuiltIn: Boolean(row.isBuiltIn),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  getAll(): DbWorkspace[] {
    const stmt = this.db.prepare("SELECT * FROM workspaces ORDER BY sortOrder ASC, name ASC");
    const rows = stmt.all() as DbWorkspaceRow[];
    return rows.map((row) => this.transformRow(row));
  }

  getAllSummaries(): DbWorkspaceSummary[] {
    const stmt = this.db.prepare(
      "SELECT id, name, description, isDefault, isBuiltIn, sortOrder FROM workspaces ORDER BY sortOrder ASC, name ASC"
    );
    const rows = stmt.all() as DbWorkspaceSummaryRow[];
    return rows.map((row) => ({
      ...row,
      isDefault: Boolean(row.isDefault),
      isBuiltIn: Boolean(row.isBuiltIn),
    }));
  }

  getById(id: string): DbWorkspace | null {
    const stmt = this.db.prepare("SELECT * FROM workspaces WHERE id = ?");
    const row = stmt.get(id) as DbWorkspaceRow | undefined;
    if (!row) return null;
    return this.transformRow(row);
  }

  getDefault(): DbWorkspace | null {
    const stmt = this.db.prepare("SELECT * FROM workspaces WHERE isDefault = 1 LIMIT 1");
    const row = stmt.get() as DbWorkspaceRow | undefined;
    if (!row) return null;
    return this.transformRow(row);
  }

  getBuiltIn(): DbWorkspace[] {
    const stmt = this.db.prepare(
      "SELECT * FROM workspaces WHERE isBuiltIn = 1 ORDER BY sortOrder ASC"
    );
    const rows = stmt.all() as DbWorkspaceRow[];
    return rows.map((row) => this.transformRow(row));
  }

  /**
   * Create a new workspace
   */
  create(workspace: DbWorkspaceInput): void {
    const now = new Date();
    const stmt = this.db.prepare(`
      INSERT INTO workspaces (id, name, description, layoutJson, panelColors, isDefault, isBuiltIn, sortOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      workspace.id,
      workspace.name,
      workspace.description || null,
      workspace.layoutJson,
      JSON.stringify(workspace.panelColors || {}),
      workspace.isDefault ? 1 : 0,
      workspace.isBuiltIn ? 1 : 0,
      workspace.sortOrder ?? 0,
      (workspace.createdAt || now).toISOString(),
      (workspace.updatedAt || now).toISOString()
    );
    this.logger.info(`Created workspace: ${workspace.name} (${workspace.id})`);
  }

  /**
   * Update a workspace
   */
  update(id: string, updates: DbWorkspaceUpdate): void {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Workspace with id ${id} not found`);
    }

    const merged = {
      name: updates.name !== undefined ? updates.name : existing.name,
      description: updates.description !== undefined ? updates.description : existing.description,
      layoutJson: updates.layoutJson !== undefined ? updates.layoutJson : existing.layoutJson,
      panelColors: updates.panelColors !== undefined ? updates.panelColors : existing.panelColors,
      isDefault: updates.isDefault !== undefined ? updates.isDefault : existing.isDefault,
      sortOrder: updates.sortOrder !== undefined ? updates.sortOrder : existing.sortOrder,
      updatedAt: updates.updatedAt || new Date(),
    };

    const stmt = this.db.prepare(`
      UPDATE workspaces
      SET name = ?, description = ?, layoutJson = ?, panelColors = ?, isDefault = ?, sortOrder = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.name,
      merged.description || null,
      merged.layoutJson,
      JSON.stringify(merged.panelColors || {}),
      merged.isDefault ? 1 : 0,
      merged.sortOrder,
      merged.updatedAt instanceof Date ? merged.updatedAt.toISOString() : merged.updatedAt,
      id
    );
    this.logger.info(`Updated workspace: ${merged.name} (${id})`);
  }

  /**
   * Set a workspace as the default (clears other defaults first)
   */
  setDefault(id: string): void {
    const workspace = this.getById(id);
    if (!workspace) {
      throw new Error(`Workspace with id ${id} not found`);
    }

    // Clear all other defaults
    this.db.prepare("UPDATE workspaces SET isDefault = 0").run();

    // Set this one as default
    this.db.prepare("UPDATE workspaces SET isDefault = 1, updatedAt = ? WHERE id = ?").run(
      new Date().toISOString(),
      id
    );

    this.logger.info(`Set default workspace: ${workspace.name} (${id})`);
  }

  /**
   * Delete a workspace (fails for built-in workspaces)
   */
  delete(id: string): void {
    const workspace = this.getById(id);
    if (!workspace) {
      throw new Error(`Workspace with id ${id} not found`);
    }

    if (workspace.isBuiltIn) {
      throw new Error(`Cannot delete built-in workspace: ${workspace.name}`);
    }

    const stmt = this.db.prepare("DELETE FROM workspaces WHERE id = ?");
    stmt.run(id);
    this.logger.info(`Deleted workspace: ${workspace.name} (${id})`);
  }

  /**
   * Reorder workspaces based on array of IDs
   */
  reorder(ids: string[]): void {
    const stmt = this.db.prepare("UPDATE workspaces SET sortOrder = ?, updatedAt = ? WHERE id = ?");
    const now = new Date().toISOString();

    ids.forEach((id, index) => {
      stmt.run(index, now, id);
    });

    this.logger.info(`Reordered ${ids.length} workspaces`);
  }

  /**
   * Check if a workspace with the given name exists
   */
  existsByName(name: string): boolean {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM workspaces WHERE name = ?");
    const result = stmt.get(name) as { count: number };
    return result.count > 0;
  }

  /**
   * Get the next available sort order
   */
  getNextSortOrder(): number {
    const stmt = this.db.prepare("SELECT MAX(sortOrder) as maxOrder FROM workspaces");
    const result = stmt.get() as { maxOrder: number | null };
    return (result.maxOrder ?? -1) + 1;
  }
}
