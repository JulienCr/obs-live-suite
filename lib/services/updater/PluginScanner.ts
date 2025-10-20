import { readdirSync, statSync, existsSync } from "fs";
import { join, basename } from "path";
import { PathResolver } from "./PathResolver";
import { VersionExtractor } from "./VersionExtractor";
import { Logger } from "../../utils/Logger";
import { PluginKind, CreatePluginInput, UpdateStatus } from "../../models/Plugin";

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
    const seen = new Set<string>();

    try {
      const entries = readdirSync(directory);

      for (const entry of entries) {
        const fullPath = join(directory, entry);
        const stats = statSync(fullPath);

        // Skip common non-plugin directories (32bit, 64bit on Windows)
        if (stats.isDirectory() && (entry === "32bit" || entry === "64bit" || entry === "bin")) {
          // Scan inside these directories for actual plugins (DLLs on Windows, dylibs on Mac)
          try {
            const subEntries = readdirSync(fullPath);
            for (const subEntry of subEntries) {
              const subPath = join(fullPath, subEntry);
              const subStats = statSync(subPath);
              
              // On Windows, plugins are DLL files
              if (subStats.isFile() && (subEntry.endsWith(".dll") || subEntry.endsWith(".so") || subEntry.endsWith(".dylib"))) {
                const name = basename(subEntry, subEntry.match(/\.(dll|so|dylib)$/)?.[0] || "");
                
                // Avoid duplicates (same plugin in 32bit and 64bit)
                if (seen.has(name)) continue;
                seen.add(name);

                const version = this.versionExtractor.extractFromPlugin(subPath);

                plugins.push({
                  name,
                  kind: PluginKind.PLUGIN,
                  localVersion: version,
                  paths: [subPath],
                  registryId: this.normalizeRegistryId(name),
                  updateStatus: UpdateStatus.UNKNOWN,
                  isIgnored: false,
                  isWatched: false,
                });
              }
            }
          } catch (subError) {
            this.logger.error(`Failed to scan subdirectory ${fullPath}`, subError);
          }
          continue;
        }

        // Handle regular plugin directories (for systems where plugins are in their own folders)
        if (stats.isDirectory()) {
          const version = this.versionExtractor.extractFromPlugin(fullPath);
          const name = basename(entry);

          if (seen.has(name)) continue;
          seen.add(name);

          plugins.push({
            name,
            kind: PluginKind.PLUGIN,
            localVersion: version,
            paths: [fullPath],
            registryId: this.normalizeRegistryId(name),
            updateStatus: UpdateStatus.UNKNOWN,
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
            updateStatus: UpdateStatus.UNKNOWN,
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

