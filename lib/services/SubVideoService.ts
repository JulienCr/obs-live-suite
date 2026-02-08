import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { PathManager } from "../config/PathManager";
import { Logger } from "../utils/Logger";
import { PosterRepository } from "../repositories/PosterRepository";
import { DbPoster, DbPosterInput } from "../models/Database";
import { PosterType, EndBehavior } from "../models/Poster";
import { extractYouTubeId, isYouTubeUrl } from "../utils/urlDetection";
import { urlToFilePath } from "../utils/fileUpload";

/**
 * Parameters for creating a sub-video
 */
export interface CreateSubVideoParams {
  parentPosterId: string;
  title: string;
  startTime: number;
  endTime: number;
  endBehavior: EndBehavior;
  thumbnailUrl?: string | null;
}

/**
 * SubVideoService handles sub-video creation and thumbnail generation
 * Uses singleton pattern for consistent access
 */
export class SubVideoService {
  private static instance: SubVideoService;
  private pathManager: PathManager;
  private posterRepository: PosterRepository;
  private logger: Logger;
  private thumbnailsDir: string;

  private constructor() {
    this.pathManager = PathManager.getInstance();
    this.posterRepository = PosterRepository.getInstance();
    this.logger = new Logger("SubVideoService");
    this.thumbnailsDir = join(this.pathManager.getAssetsDir(), "thumbnails");
    this.ensureThumbnailsDir();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): SubVideoService {
    if (!SubVideoService.instance) {
      SubVideoService.instance = new SubVideoService();
    }
    return SubVideoService.instance;
  }

  /**
   * Ensure thumbnails directory exists
   */
  private ensureThumbnailsDir(): void {
    if (!existsSync(this.thumbnailsDir)) {
      mkdirSync(this.thumbnailsDir, { recursive: true });
      this.logger.info(`Created thumbnails directory: ${this.thumbnailsDir}`);
    }
  }

  /**
   * Get the thumbnails directory path
   */
  getThumbnailsDir(): string {
    return this.thumbnailsDir;
  }

  /**
   * Create a new sub-video from a parent video
   * @param params - Sub-video creation parameters
   * @returns The created sub-video poster
   */
  createSubVideo(params: CreateSubVideoParams): DbPoster {
    const { parentPosterId, title, startTime, endTime, endBehavior, thumbnailUrl } = params;

    // Validate parent poster exists and is a video
    const parentPoster = this.posterRepository.getById(parentPosterId);
    if (!parentPoster) {
      throw new Error(`Parent poster not found: ${parentPosterId}`);
    }

    if (parentPoster.type !== PosterType.VIDEO && parentPoster.type !== PosterType.YOUTUBE) {
      throw new Error(`Parent poster must be a video type, got: ${parentPoster.type}`);
    }

    // Validate time range
    if (startTime < 0) {
      throw new Error("Start time must be positive");
    }
    if (endTime <= startTime) {
      throw new Error("End time must be greater than start time");
    }

    // For YouTube videos, duration may be unknown
    // Only validate if duration is available
    if (parentPoster.duration && parentPoster.duration > 0) {
      if (endTime > parentPoster.duration) {
        this.logger.warn(`End time ${endTime} exceeds known duration ${parentPoster.duration}`);
      }
    } else {
      this.logger.info(`Creating sub-video for ${parentPoster.type} without known duration - clip times will not be validated against total duration`);
    }

    // Calculate duration from the clip range
    const duration = endTime - startTime;

    // Create the sub-video poster entry
    const subVideoId = randomUUID();
    const now = new Date();

    const subVideoPoster: DbPosterInput = {
      id: subVideoId,
      title,
      description: `Sub-video of "${parentPoster.title}" (${this.formatTime(startTime)} - ${this.formatTime(endTime)})`,
      source: parentPoster.source,
      fileUrl: parentPoster.fileUrl, // Same video file as parent
      type: parentPoster.type,
      duration,
      tags: [...parentPoster.tags], // Inherit tags from parent
      profileIds: [...parentPoster.profileIds], // Inherit profile assignments
      metadata: {
        parentTitle: parentPoster.title,
        clipRange: { start: startTime, end: endTime },
      },
      chatMessage: null,
      isEnabled: true,
      // Sub-video specific fields
      parentPosterId,
      startTime,
      endTime,
      thumbnailUrl: thumbnailUrl || null,
      endBehavior,
      createdAt: now,
      updatedAt: now,
    };

    this.posterRepository.create(subVideoPoster);
    this.logger.info(`Created sub-video: ${title} (${subVideoId}) from parent ${parentPosterId}`);

    // Return the created poster
    const created = this.posterRepository.getById(subVideoId);
    if (!created) {
      throw new Error("Failed to retrieve created sub-video");
    }

    return created;
  }

  /**
   * Generate a thumbnail from a local video file using ffmpeg
   * @param fileUrl - Path to the local video file
   * @param timestamp - Timestamp in seconds to extract the frame
   * @returns Path to the generated thumbnail
   */
  async generateLocalVideoThumbnail(fileUrl: string, timestamp: number): Promise<string> {
    this.ensureThumbnailsDir();

    // Resolve the file path (convert /data/uploads/... URL to filesystem path)
    const videoPath = urlToFilePath(fileUrl);

    if (!existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Generate unique thumbnail filename
    const videoBasename = basename(videoPath, ".mp4").replace(/[^a-zA-Z0-9-_]/g, "_");
    const thumbnailFilename = `${videoBasename}_${timestamp.toFixed(1).replace(".", "_")}_${randomUUID().slice(0, 8)}.jpg`;
    const thumbnailPath = join(this.thumbnailsDir, thumbnailFilename);

    this.logger.info(`Generating thumbnail from ${videoPath} at ${timestamp}s`);

    return new Promise((resolve, reject) => {
      // Use ffmpeg to extract a frame
      // -ss before -i for faster seeking
      // -frames:v 1 to extract single frame
      // -q:v 2 for good quality JPEG
      const ffmpeg = spawn("ffmpeg", [
        "-ss", timestamp.toString(),
        "-i", videoPath,
        "-frames:v", "1",
        "-q:v", "2",
        "-y", // Overwrite if exists
        thumbnailPath,
      ]);

      let stderr = "";

      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0 && existsSync(thumbnailPath)) {
          this.logger.info(`Thumbnail generated: ${thumbnailPath}`);
          // Return URL path for storage in DB (served via /data/[...path] route)
          resolve(`/data/assets/thumbnails/${thumbnailFilename}`);
        } else {
          this.logger.error(`ffmpeg failed with code ${code}`, stderr);
          reject(new Error(`Failed to generate thumbnail: ffmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on("error", (err) => {
        this.logger.error("ffmpeg spawn error", err);
        reject(new Error(`Failed to run ffmpeg: ${err.message}`));
      });
    });
  }

  /**
   * Get YouTube thumbnail URL for a video
   * @param fileUrl - YouTube video URL
   * @param quality - Thumbnail quality (default, medium, high, standard, maxres)
   * @returns YouTube thumbnail URL
   */
  getYouTubeThumbnailUrl(fileUrl: string, quality: "default" | "mq" | "hq" | "sd" | "maxres" = "hq"): string | null {
    if (!isYouTubeUrl(fileUrl)) {
      return null;
    }

    const videoId = extractYouTubeId(fileUrl);
    if (!videoId) {
      return null;
    }

    // YouTube thumbnail URL formats:
    // default (120x90): https://img.youtube.com/vi/{id}/default.jpg
    // mq (320x180): https://img.youtube.com/vi/{id}/mqdefault.jpg
    // hq (480x360): https://img.youtube.com/vi/{id}/hqdefault.jpg
    // sd (640x480): https://img.youtube.com/vi/{id}/sddefault.jpg
    // maxres (1280x720): https://img.youtube.com/vi/{id}/maxresdefault.jpg
    const qualityMap = {
      default: "default.jpg",
      mq: "mqdefault.jpg",
      hq: "hqdefault.jpg",
      sd: "sddefault.jpg",
      maxres: "maxresdefault.jpg",
    };

    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}`;
  }

  /**
   * Format time in seconds to human-readable string
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Get all sub-videos for a parent poster
   */
  getSubVideos(parentPosterId: string): DbPoster[] {
    return this.posterRepository.getSubVideos(parentPosterId);
  }

  /**
   * Check if a poster is a sub-video
   */
  isSubVideo(posterId: string): boolean {
    const poster = this.posterRepository.getById(posterId);
    return poster !== null && poster.parentPosterId !== null;
  }

  /**
   * Get the parent poster for a sub-video
   */
  getParentPoster(subVideoId: string): DbPoster | null {
    return this.posterRepository.getParentPoster(subVideoId);
  }

  /**
   * Delete a sub-video and optionally its thumbnail
   * @param subVideoId - ID of the sub-video to delete
   * @param deleteThumbnail - Whether to delete the associated thumbnail file
   */
  async deleteSubVideo(subVideoId: string, deleteThumbnail = true): Promise<void> {
    const subVideo = this.posterRepository.getById(subVideoId);
    if (!subVideo) {
      throw new Error(`Sub-video not found: ${subVideoId}`);
    }

    if (!subVideo.parentPosterId) {
      throw new Error(`Poster ${subVideoId} is not a sub-video`);
    }

    // Delete thumbnail file if it exists and is a local file
    if (deleteThumbnail && subVideo.thumbnailUrl && subVideo.thumbnailUrl.startsWith("/data/assets/thumbnails/")) {
      const thumbnailPath = join(this.pathManager.getAssetsDir(), subVideo.thumbnailUrl.replace("/data/assets/", ""));
      if (existsSync(thumbnailPath)) {
        const { unlink } = await import("fs/promises");
        await unlink(thumbnailPath);
        this.logger.info(`Deleted thumbnail: ${thumbnailPath}`);
      }
    }

    // Delete the poster entry
    this.posterRepository.delete(subVideoId);
    this.logger.info(`Deleted sub-video: ${subVideoId}`);
  }
}
