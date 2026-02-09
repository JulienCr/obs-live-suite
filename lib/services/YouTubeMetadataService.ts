import { Logger } from "../utils/Logger";
import { parseISO8601Duration } from "../utils/durationParser";
import { AppConfig } from "../config/AppConfig";

/**
 * YouTube video metadata from Data API v3
 */
export interface YouTubeVideoMetadata {
  videoId: string;
  title: string;
  /** Duration in seconds */
  duration: number;
  thumbnailUrl: string;
  channelTitle: string;
}

/**
 * YouTube Data API v3 response types
 */
interface YouTubeApiSnippet {
  title: string;
  channelTitle: string;
  thumbnails: {
    high?: { url: string };
    medium?: { url: string };
    default?: { url: string };
  };
}

interface YouTubeApiContentDetails {
  duration: string; // ISO 8601 format (e.g., "PT15M33S")
}

interface YouTubeApiVideoItem {
  id: string;
  snippet: YouTubeApiSnippet;
  contentDetails: YouTubeApiContentDetails;
}

interface YouTubeApiResponse {
  items: YouTubeApiVideoItem[];
}

/**
 * YouTubeMetadataService fetches video metadata from YouTube Data API v3
 * Uses singleton pattern for consistent access
 */
export class YouTubeMetadataService {
  private static instance: YouTubeMetadataService;
  private logger: Logger;
  private apiKey: string | undefined;
  private baseUrl = "https://www.googleapis.com/youtube/v3/videos";

  private constructor() {
    this.logger = new Logger("YouTubeMetadataService");
    const config = AppConfig.getInstance();
    this.apiKey = config.youtubeApiKey;

    if (!this.apiKey) {
      this.logger.warn(
        "YouTube API key not configured. Set YOUTUBE_API_KEY in .env to enable metadata fetching."
      );
    }
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): YouTubeMetadataService {
    if (!YouTubeMetadataService.instance) {
      YouTubeMetadataService.instance = new YouTubeMetadataService();
    }
    return YouTubeMetadataService.instance;
  }

  /**
   * Check if the API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Fetch metadata for a YouTube video by video ID
   * 
   * @param videoId - YouTube video ID (e.g., "dQw4w9WgXcQ")
   * @returns Video metadata or null if not found or API not configured
   * 
   * @example
   * const service = YouTubeMetadataService.getInstance();
   * const metadata = await service.fetchMetadata("dQw4w9WgXcQ");
   * if (metadata) {
   *   console.log(metadata.title, metadata.duration);
   * }
   */
  async fetchMetadata(videoId: string): Promise<YouTubeVideoMetadata | null> {
    if (!this.apiKey) {
      this.logger.warn("Cannot fetch metadata: YouTube API key not configured");
      return null;
    }

    const trimmedId = videoId?.trim();
    if (!trimmedId) {
      this.logger.error("Invalid or empty video ID provided");
      return null;
    }

    this.logger.info(`Fetching metadata for video: ${trimmedId}`);

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set("part", "snippet,contentDetails");
      url.searchParams.set("id", trimmedId);
      url.searchParams.set("key", this.apiKey);

      const response = await fetch(url.toString());

      if (!response.ok) {
        this.logger.error(
          `YouTube API request failed: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = (await response.json()) as YouTubeApiResponse;

      if (!data.items || data.items.length === 0) {
        this.logger.warn(`No video found for ID: ${trimmedId}`);
        return null;
      }

      const video = data.items[0];

      // Parse duration from ISO 8601 format
      const duration = parseISO8601Duration(video.contentDetails.duration);

      // Select best thumbnail (prefer high, fallback to medium, then default)
      const thumbnails = video.snippet.thumbnails;
      const thumbnailUrl =
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        "";

      const metadata: YouTubeVideoMetadata = {
        videoId: trimmedId,
        title: video.snippet.title,
        duration,
        thumbnailUrl,
        channelTitle: video.snippet.channelTitle,
      };

      this.logger.info(
        `Successfully fetched metadata for "${metadata.title}" (${duration}s)`
      );

      return metadata;
    } catch (error) {
      this.logger.error(`Error fetching YouTube metadata for ${trimmedId}:`, error);
      return null;
    }
  }
}
