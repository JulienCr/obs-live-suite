import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { Logger } from "../../utils/Logger";

/**
 * VersionExtractor extracts version information from plugin files
 */
export class VersionExtractor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("VersionExtractor");
  }

  /**
   * Extract version from plugin directory
   */
  extractFromPlugin(pluginPath: string): string | undefined {
    try {
      // Look for version in metadata files
      const metadataFiles = ["plugin.json", "manifest.json", "package.json"];

      for (const file of metadataFiles) {
        const filePath = join(pluginPath, file);
        if (existsSync(filePath)) {
          const version = this.extractFromJSON(filePath);
          if (version) return version;
        }
      }

      // Look for .ini files
      const iniPath = join(pluginPath, "plugin.ini");
      if (existsSync(iniPath)) {
        const version = this.extractFromINI(iniPath);
        if (version) return version;
      }

      return undefined;
    } catch (error) {
      this.logger.error(`Failed to extract version from ${pluginPath}`, error);
      return undefined;
    }
  }

  /**
   * Extract version from script file
   */
  extractFromScript(scriptPath: string): string | undefined {
    try {
      const ext = extname(scriptPath);
      const content = readFileSync(scriptPath, "utf-8");

      if (ext === ".lua") {
        return this.extractFromLua(content);
      } else if (ext === ".py") {
        return this.extractFromPython(content);
      }

      return undefined;
    } catch (error) {
      this.logger.error(`Failed to extract version from ${scriptPath}`, error);
      return undefined;
    }
  }

  /**
   * Extract version from JSON file
   */
  private extractFromJSON(filePath: string): string | undefined {
    try {
      const content = readFileSync(filePath, "utf-8");
      const json = JSON.parse(content);
      return json.version || json.Version;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract version from INI file
   */
  private extractFromINI(filePath: string): string | undefined {
    try {
      const content = readFileSync(filePath, "utf-8");
      const versionMatch = content.match(/version\s*=\s*([^\s\n]+)/i);
      return versionMatch ? versionMatch[1] : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract version from Lua script
   */
  private extractFromLua(content: string): string | undefined {
    const patterns = [
      /version\s*=\s*["']([^"']+)["']/i,
      /--\s*version:?\s*([^\s\n]+)/i,
      /obs_module_version\s*=\s*["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  /**
   * Extract version from Python script
   */
  private extractFromPython(content: string): string | undefined {
    const patterns = [
      /__version__\s*=\s*["']([^"']+)["']/,
      /version\s*=\s*["']([^"']+)["']/i,
      /#\s*version:?\s*([^\s\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }
}

