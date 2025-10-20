import { Logger } from "../../utils/Logger";
import { AppConfig } from "../../config/AppConfig";
import * as semver from "semver";

/**
 * GitHub release information
 */
export interface GitHubRelease {
  version: string;
  url: string;
  notes: string;
  publishedAt: Date;
}

/**
 * GitHubReleaseChecker fetches latest releases from GitHub
 */
export class GitHubReleaseChecker {
  private logger: Logger;
  private config: AppConfig;
  private cache: Map<string, { release: GitHubRelease; timestamp: number }>;
  private cacheDuration: number;

  constructor() {
    this.logger = new Logger("GitHubReleaseChecker");
    this.config = AppConfig.getInstance();
    this.cache = new Map();
    this.cacheDuration = 3600000; // 1 hour
  }

  /**
   * Get latest release for a repository
   */
  async getLatestRelease(repo: string): Promise<GitHubRelease | null> {
    const cached = this.cache.get(repo);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.release;
    }

    try {
      const url = `https://api.github.com/repos/${repo}/releases/latest`;
      const headers: Record<string, string> = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "OBS-Live-Suite",
      };

      const token = this.config.githubToken;
      if (token) {
        headers["Authorization"] = `token ${token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        this.logger.warn(`Failed to fetch release for ${repo}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const release: GitHubRelease = {
        version: this.normalizeVersion(data.tag_name),
        url: data.html_url,
        notes: data.body || "",
        publishedAt: new Date(data.published_at),
      };

      this.cache.set(repo, { release, timestamp: Date.now() });
      return release;
    } catch (error) {
      this.logger.error(`Failed to check release for ${repo}`, error);
      return null;
    }
  }

  /**
   * Compare versions and check if update is available
   */
  hasUpdate(currentVersion: string | undefined, latestVersion: string): boolean {
    if (!currentVersion) return true;

    try {
      const current = semver.coerce(currentVersion);
      const latest = semver.coerce(latestVersion);

      if (!current || !latest) {
        return currentVersion !== latestVersion;
      }

      return semver.gt(latest, current);
    } catch {
      return currentVersion !== latestVersion;
    }
  }

  /**
   * Normalize version string
   */
  private normalizeVersion(version: string): string {
    return version.replace(/^v/, "");
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info("Release cache cleared");
  }
}

