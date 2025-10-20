import { readFileSync, existsSync, readdirSync } from "fs";
import { join, extname, dirname, basename } from "path";
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
   * Extract version from plugin directory or DLL file
   */
  extractFromPlugin(pluginPath: string): string | undefined {
    try {
      // Check if it's a DLL file (Windows plugin)
      if (pluginPath.endsWith('.dll') || pluginPath.endsWith('.so') || pluginPath.endsWith('.dylib')) {
        return this.extractFromPluginFile(pluginPath);
      }

      // Look for version in metadata files (for directory-based plugins)
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
   * Extract version from plugin file (DLL/SO/DYLIB)
   */
  private extractFromPluginFile(filePath: string): string | undefined {
    try {
      const pluginName = basename(filePath, extname(filePath));
      const parentDir = dirname(filePath);
      const grandparentDir = dirname(parentDir); // Go up from 64bit to obs-plugins
      
      // Strategy 1: Look for JSON file with same name in same directory
      const jsonSameName = join(parentDir, `${pluginName}.json`);
      if (existsSync(jsonSameName)) {
        const version = this.extractFromJSON(jsonSameName);
        if (version) return version;
      }

      // Strategy 2: Look in OBS data folder structure
      // C:\Program Files\obs-studio\data\obs-plugins\[plugin-name]\
      const obsRoot = dirname(dirname(grandparentDir)); // Up to obs-studio folder
      const dataPath = join(obsRoot, 'data', 'obs-plugins', pluginName);
      
      if (existsSync(dataPath)) {
        // Look for version files in data directory
        const versionFiles = ['manifest.json', 'plugin.json', 'version.txt', 'VERSION'];
        for (const file of versionFiles) {
          const versionFilePath = join(dataPath, file);
          if (existsSync(versionFilePath)) {
            if (file.endsWith('.json')) {
              const version = this.extractFromJSON(versionFilePath);
              if (version) return version;
            } else {
              // Plain text version file
              const content = readFileSync(versionFilePath, 'utf-8').trim();
              const versionMatch = content.match(/(\d+\.\d+\.\d+[\w.-]*)/);
              if (versionMatch) return versionMatch[1];
            }
          }
        }

        // Look for locale/en-US.ini which often contains version
        const localeIni = join(dataPath, 'locale', 'en-US.ini');
        if (existsSync(localeIni)) {
          const content = readFileSync(localeIni, 'utf-8');
          const versionMatch = content.match(/Version\s*=\s*"?([^"\s\n]+)"?/i);
          if (versionMatch) return versionMatch[1];
        }
      }

      // Strategy 3: Check the README or changelog files nearby
      const docsDir = join(grandparentDir, '..', 'docs', 'plugins', pluginName);
      if (existsSync(docsDir)) {
        try {
          const files = readdirSync(docsDir);
          const readmeFile = files.find(f => f.toLowerCase().startsWith('readme'));
          if (readmeFile) {
            const content = readFileSync(join(docsDir, readmeFile), 'utf-8');
            const versionMatch = content.match(/version[:\s]+(\d+\.\d+\.\d+[\w.-]*)/i);
            if (versionMatch) return versionMatch[1];
          }
        } catch {
          // Ignore errors reading docs
        }
      }

      return undefined;
    } catch (error) {
      this.logger.error(`Failed to extract version from plugin file ${filePath}`, error);
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

