import { z } from "zod";
import { SubVideoService } from "@/lib/services/SubVideoService";
import { isYouTubeUrl } from "@/lib/utils/urlDetection";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ThumbnailAPI]";

/**
 * Schema for thumbnail generation request
 */
const generateThumbnailSchema = z.object({
  fileUrl: z.string().min(1, "File URL is required"),
  timestamp: z.number().min(0, "Timestamp must be non-negative"),
  quality: z.enum(["default", "mq", "hq", "sd", "maxres"]).optional().default("hq"),
});

/**
 * POST /api/assets/thumbnail
 * Generate a thumbnail from a video file at a specific timestamp
 *
 * For local videos: Uses ffmpeg to extract a frame
 * For YouTube: Returns the standard YouTube thumbnail URL
 *
 * Request body:
 * - fileUrl: Path to the video file or YouTube URL
 * - timestamp: Timestamp in seconds to extract the frame
 * - quality: (optional) YouTube thumbnail quality (default, mq, hq, sd, maxres)
 *
 * Response:
 * - thumbnailUrl: URL/path to the generated thumbnail
 * - source: "local" or "youtube"
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();

  // Validate input
  const parseResult = generateThumbnailSchema.safeParse(body);
  if (!parseResult.success) {
    return ApiResponses.badRequest(
      "Invalid request data",
      parseResult.error.flatten()
    );
  }

  const { fileUrl, timestamp, quality } = parseResult.data;
  const subVideoService = SubVideoService.getInstance();

  // Check if it's a YouTube URL
  if (isYouTubeUrl(fileUrl)) {
    const thumbnailUrl = subVideoService.getYouTubeThumbnailUrl(fileUrl, quality);

    if (!thumbnailUrl) {
      return ApiResponses.badRequest("Could not extract YouTube video ID from URL");
    }

    return ApiResponses.ok({
      thumbnailUrl,
      source: "youtube",
      timestamp,
      message: "YouTube thumbnail URL generated (note: YouTube thumbnails are fixed and do not correspond to specific timestamps)",
    });
  }

  // Local video file - use ffmpeg to extract frame
  try {
    const thumbnailUrl = await subVideoService.generateLocalVideoThumbnail(fileUrl, timestamp);

    return ApiResponses.ok({
      thumbnailUrl,
      source: "local",
      timestamp,
      message: `Thumbnail generated at ${timestamp}s`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate thumbnail";

    // Check for specific error types
    if (message.includes("not found")) {
      return ApiResponses.notFound("Video file");
    }

    if (message.includes("ffmpeg")) {
      return ApiResponses.serviceUnavailable(
        "FFmpeg is required for local video thumbnail generation. Please ensure ffmpeg is installed and available in PATH."
      );
    }

    return ApiResponses.serverError(message);
  }
}, LOG_CONTEXT);
