import archiver from "archiver";
import { createWriteStream, existsSync } from "fs";
import { join } from "path";
import { PathManager } from "../config/PathManager";
import { Logger } from "../utils/Logger";
import { DatabaseService } from "./DatabaseService";

/**
 * BackupService handles profile export and import operations
 */
export class BackupService {
  private static instance: BackupService;
  private pathManager: PathManager;
  private logger: Logger;

  private constructor() {
    this.pathManager = PathManager.getInstance();
    this.logger = new Logger("BackupService");
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Export a profile as a zip file
   */
  async exportProfile(profileId: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `profile-${profileId}-${timestamp}.zip`;
    const outputPath = join(this.pathManager.getBackupsDir(), filename);

    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        this.logger.info(`Profile exported: ${filename} (${archive.pointer()} bytes)`);
        resolve(outputPath);
      });

      archive.on("error", (err) => {
        this.logger.error("Export failed", err);
        reject(err);
      });

      archive.pipe(output);

      // Add profile data from database
      const db = DatabaseService.getInstance().getDb();
      const profileData = db.prepare("SELECT * FROM profiles WHERE id = ?").get(profileId);
      archive.append(JSON.stringify(profileData, null, 2), { name: "profile.json" });

      // Add related data
      const presets = db.prepare("SELECT * FROM presets WHERE profileId = ?").all(profileId);
      archive.append(JSON.stringify(presets, null, 2), { name: "presets.json" });

      const macros = db.prepare("SELECT * FROM macros WHERE profileId = ?").all(profileId);
      archive.append(JSON.stringify(macros, null, 2), { name: "macros.json" });

      // TODO: Add asset files (posters, avatars) if referenced by profile

      archive.finalize();
    });
  }

  /**
   * Import a profile from a zip file
   */
  async importProfile(zipPath: string): Promise<string> {
    // TODO: Implement zip extraction and profile import
    this.logger.info(`Importing profile from: ${zipPath}`);
    throw new Error("Not implemented yet");
  }

  /**
   * Export entire app configuration
   */
  async exportAppConfig(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `obs-live-suite-backup-${timestamp}.zip`;
    const outputPath = join(this.pathManager.getBackupsDir(), filename);

    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        this.logger.info(`App config exported: ${filename} (${archive.pointer()} bytes)`);
        resolve(outputPath);
      });

      archive.on("error", (err) => {
        this.logger.error("Export failed", err);
        reject(err);
      });

      archive.pipe(output);

      // Add database file
      const dbPath = this.pathManager.getDatabasePath();
      if (existsSync(dbPath)) {
        archive.file(dbPath, { name: "data.db" });
      }

      // Add assets directories
      archive.directory(this.pathManager.getPostersDir(), "posters");
      archive.directory(this.pathManager.getAvatarsDir(), "avatars");

      archive.finalize();
    });
  }
}

