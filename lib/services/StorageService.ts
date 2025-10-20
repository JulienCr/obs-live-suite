import { copyFile, unlink, existsSync, readFileSync, writeFileSync } from "fs";
import { join, extname } from "path";
import { promisify } from "util";
import { PathManager } from "../config/PathManager";
import { Logger } from "../utils/Logger";
import { randomUUID } from "crypto";

const copyFileAsync = promisify(copyFile);
const unlinkAsync = promisify(unlink);

/**
 * StorageService handles file system operations for assets
 */
export class StorageService {
  private static instance: StorageService;
  private pathManager: PathManager;
  private logger: Logger;

  private constructor() {
    this.pathManager = PathManager.getInstance();
    this.logger = new Logger("StorageService");
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Save a poster file
   */
  async savePoster(sourcePath: string): Promise<string> {
    const ext = extname(sourcePath);
    const filename = `${randomUUID()}${ext}`;
    const destPath = join(this.pathManager.getPostersDir(), filename);

    await copyFileAsync(sourcePath, destPath);
    this.logger.info(`Poster saved: ${filename}`);

    return destPath;
  }

  /**
   * Delete a poster file
   */
  async deletePoster(filePath: string): Promise<void> {
    if (existsSync(filePath)) {
      await unlinkAsync(filePath);
      this.logger.info(`Poster deleted: ${filePath}`);
    }
  }

  /**
   * Save an avatar file
   */
  async saveAvatar(sourcePath: string): Promise<string> {
    const ext = extname(sourcePath);
    const filename = `${randomUUID()}${ext}`;
    const destPath = join(this.pathManager.getAvatarsDir(), filename);

    await copyFileAsync(sourcePath, destPath);
    this.logger.info(`Avatar saved: ${filename}`);

    return destPath;
  }

  /**
   * Delete an avatar file
   */
  async deleteAvatar(filePath: string): Promise<void> {
    if (existsSync(filePath)) {
      await unlinkAsync(filePath);
      this.logger.info(`Avatar deleted: ${filePath}`);
    }
  }

  /**
   * Check if file exists
   */
  fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  /**
   * Read file as buffer
   */
  readFile(filePath: string): Buffer {
    return readFileSync(filePath);
  }

  /**
   * Write file from buffer
   */
  writeFile(filePath: string, data: Buffer): void {
    writeFileSync(filePath, data);
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath: string): number {
    if (!existsSync(filePath)) {
      return 0;
    }
    return readFileSync(filePath).length;
  }
}

