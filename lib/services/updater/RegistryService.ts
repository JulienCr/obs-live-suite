import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { Logger } from "../../utils/Logger";

/**
 * Plugin registry entry
 */
export interface RegistryEntry {
  id: string;
  name: string;
  canonicalRepo: string;
  releaseFeed: string;
  matchRules?: string[];
  compatibleOBSVersions?: string[];
}

/**
 * RegistryService manages the plugin registry
 */
export class RegistryService {
  private static instance: RegistryService;
  private logger: Logger;
  private registry: Map<string, RegistryEntry>;
  private registryPath: string;

  private constructor() {
    this.logger = new Logger("RegistryService");
    this.registry = new Map();
    this.registryPath = join(process.cwd(), "public", "registry.json");
    this.loadRegistry();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): RegistryService {
    if (!RegistryService.instance) {
      RegistryService.instance = new RegistryService();
    }
    return RegistryService.instance;
  }

  /**
   * Load registry from file
   */
  private loadRegistry(): void {
    try {
      if (existsSync(this.registryPath)) {
        const content = readFileSync(this.registryPath, "utf-8");
        const data = JSON.parse(content);

        if (Array.isArray(data.plugins)) {
          for (const entry of data.plugins) {
            this.registry.set(entry.id, entry);
          }
        }

        this.logger.info(`Loaded ${this.registry.size} plugins from registry`);
      } else {
        this.logger.warn("Registry file not found, initializing empty registry");
        this.initializeDefaultRegistry();
      }
    } catch (error) {
      this.logger.error("Failed to load registry", error);
    }
  }

  /**
   * Initialize default registry with common plugins
   */
  private initializeDefaultRegistry(): void {
    const defaultPlugins: RegistryEntry[] = [
      {
        id: "obs-websocket",
        name: "obs-websocket",
        canonicalRepo: "obsproject/obs-websocket",
        releaseFeed: "https://api.github.com/repos/obsproject/obs-websocket/releases/latest",
      },
      {
        id: "obs-move-transition",
        name: "Move Transition",
        canonicalRepo: "exeldro/obs-move-transition",
        releaseFeed: "https://api.github.com/repos/exeldro/obs-move-transition/releases/latest",
      },
      {
        id: "obs-downstream-keyer",
        name: "Downstream Keyer",
        canonicalRepo: "exeldro/obs-downstream-keyer",
        releaseFeed: "https://api.github.com/repos/exeldro/obs-downstream-keyer/releases/latest",
      },
    ];

    for (const plugin of defaultPlugins) {
      this.registry.set(plugin.id, plugin);
    }

    this.saveRegistry();
  }

  /**
   * Save registry to file
   */
  private saveRegistry(): void {
    try {
      const data = {
        plugins: Array.from(this.registry.values()),
        lastUpdated: new Date().toISOString(),
      };

      writeFileSync(this.registryPath, JSON.stringify(data, null, 2));
      this.logger.info("Registry saved");
    } catch (error) {
      this.logger.error("Failed to save registry", error);
    }
  }

  /**
   * Get registry entry by ID
   */
  getEntry(registryId: string): RegistryEntry | undefined {
    return this.registry.get(registryId);
  }

  /**
   * Get all registry entries
   */
  getAllEntries(): RegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Add or update registry entry
   */
  setEntry(entry: RegistryEntry): void {
    this.registry.set(entry.id, entry);
    this.saveRegistry();
  }

  /**
   * Remove registry entry
   */
  removeEntry(registryId: string): void {
    this.registry.delete(registryId);
    this.saveRegistry();
  }
}

