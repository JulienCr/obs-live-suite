import { readdirSync, statSync, existsSync } from "fs";
import { join, basename } from "path";
import { PathResolver } from "./PathResolver";
import { VersionExtractor } from "./VersionExtractor";
import { Logger } from "../../utils/Logger";
import { PluginKind, CreatePluginInput } from "../../models/Plugin";

/**
 * PluginScanner discovers installed OBS plugins and scripts
 */
export class PluginScanner {
  private pathResolver: PathResolver;
  private versionExtractor: VersionExtractor;
  private logger: Logger;

  constructor() {
    this.pathResolver = new PathResolver();
    this.versionExtractor = new VersionExtractor();
    this.logger = new Logger("PluginScanner");
  }

  /**
   * Scan all OBS directories for plugins and scripts
   */
  async scan(): Promise<CreatePluginInput[]> {
    const plugins: CreatePluginInput[] = [];

    // Scan plugin directories
    const pluginDirs = this.pathResolver.getPluginDirectories();
    for (const dir of pluginDirs) {
      if (existsSync(dir)) {
        const found = await this.scanPluginDirectory(dir);
        plugins.push(...found);
      }
    }

    // Scan script directories
    const scriptDirs = this.pathResolver.getScriptDirectories();
    for (const dir of scriptDirs) {
      if (existsSync(dir)) {
        const found = await this.scanScriptDirectory(dir);
        plugins.push(...found);
      }
    }

    this.logger.info(`Found ${plugins.length} plugins/scripts`);
    return plugins;
  }

  /**
   * Scan a plugin directory
   */
  private async scanPluginDirectory(directory: string): Promise<CreatePluginInput[]> {
    const plugins: CreatePluginInput[] = [];

    try {
      const entries = readdirSync(directory);

      for (const entry of entries) {
        const fullPath = join(directory, entry);
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
          const version = this.versionExtractor.extractFromPlugin(fullPath);
          const name = basename(entry);

          plugins.push({
            name,
            kind: PluginKind.PLUGIN,
            localVersion: version,
            paths: [fullPath],
            registryId: this.normalizeRegistryId(name),
            updateStatus: "unknown",
            isIgnored: false,
            isWatched: false,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to scan plugin directory ${directory}`, error);
    }

    return plugins;
  }

  /**
   * Scan a script directory
   */
  private async scanScriptDirectory(directory: string): Promise<CreatePluginInput[]> {
    const scripts: CreatePluginInput[] = [];

    try {
      const entries = readdirSync(directory);

      for (const entry of entries) {
        if (entry.endsWith(".lua") || entry.endsWith(".py")) {
          const fullPath = join(directory, entry);
          const version = this.versionExtractor.extractFromScript(fullPath);
          const name = basename(entry, entry.endsWith(".lua") ? ".lua" : ".py");

          scripts.push({
            name,
            kind: PluginKind.SCRIPT,
            localVersion: version,
            paths: [fullPath],
            registryId: this.normalizeRegistryId(name),
            updateStatus: "unknown",
            isIgnored: false,
            isWatched: false,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to scan script directory ${directory}`, error);
    }

    return scripts;
  }

  /**
   * Normalize plugin name to registry ID
   */
  private normalizeRegistryId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  }
}

