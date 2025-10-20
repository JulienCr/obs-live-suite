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
    const pluginMap = new Map<string, CreatePluginInput>();
    const processedDirs = new Set<string>();

    // Scan plugin directories (deduplicate paths)
    const pluginDirs = this.pathResolver.getPluginDirectories();
    for (const dir of pluginDirs) {
      // Skip if we already processed this directory
      if (processedDirs.has(dir)) continue;
      processedDirs.add(dir);

      if (existsSync(dir)) {
        const found = await this.scanPluginDirectory(dir);
        for (const plugin of found) {
          // Use plugin name as key to deduplicate
          if (!pluginMap.has(plugin.name)) {
            pluginMap.set(plugin.name, plugin);
          }
        }
      }
    }

    // Scan script directories (deduplicate paths)
    const scriptDirs = this.pathResolver.getScriptDirectories();
    for (const dir of scriptDirs) {
      if (processedDirs.has(dir)) continue;
      processedDirs.add(dir);

      if (existsSync(dir)) {
        const found = await this.scanScriptDirectory(dir);
        for (const plugin of found) {
          if (!pluginMap.has(plugin.name)) {
            pluginMap.set(plugin.name, plugin);
          }
        }
      }
    }

    const plugins = Array.from(pluginMap.values());
    this.logger.info(`Found ${plugins.length} unique plugins/scripts`);
    return plugins;
  }

  /**
   * Built-in OBS plugins that ship with OBS Studio
   */
  private readonly BUILTIN_PLUGINS = new Set([
    // Core OBS plugins
    "obs-browser", "obs-ffmpeg", "obs-filters", "obs-nvenc", "obs-outputs",
    "obs-qsv11", "obs-text", "obs-transitions", "obs-vst", "obs-x264",
    "obs-webrtc", "obs-websocket", "obs-websocket-compat",
    // Platform-specific
    "win-capture", "win-dshow", "win-wasapi", "coreaudio-encoder",
    "linux-capture", "linux-v4l2", "mac-capture", "mac-syphon",
    // Media sources
    "image-source", "vlc-video", "rtmp-services", "text-freetype2",
    // Frontend
    "frontend-tools",
    // Hardware encoders
    "decklink", "decklink-captions", "decklink-output-ui",
    "aja", "aja-output-ui",
    // Browser dependencies
    "chrome_elf", "libcef", "libEGL", "libGLESv2",
    // NVIDIA
    "nv-filters",
    // Other vendor plugins that come bundled
    "logi_obs_plugin_x64", "elgato-marketplace-connect", "distroav", "durchblick",
  ]);

  /**
   * Check if a plugin is built-in to OBS
   */
  isBuiltinPlugin(name: string): boolean {
    return this.BUILTIN_PLUGINS.has(name);
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
                const version = this.versionExtractor.extractFromPlugin(subPath);

                plugins.push({
                  name,
                  kind: PluginKind.PLUGIN,
                  localVersion: version,
                  paths: [subPath],
                  registryId: this.normalizeRegistryId(name),
                  updateStatus: UpdateStatus.UNKNOWN,
                  isIgnored: this.isBuiltinPlugin(name), // Mark built-in plugins as ignored by default
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

          plugins.push({
            name,
            kind: PluginKind.PLUGIN,
            localVersion: version,
            paths: [fullPath],
            registryId: this.normalizeRegistryId(name),
            updateStatus: UpdateStatus.UNKNOWN,
            isIgnored: this.isBuiltinPlugin(name),
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

