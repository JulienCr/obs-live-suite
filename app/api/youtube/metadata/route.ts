import { YouTubeMetadataService } from "@/lib/services/YouTubeMetadataService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { z } from "zod";

const LOG_CONTEXT = "[YouTubeMetadataAPI]";

const metadataRequestSchema = z.object({
  videoId: z.string().min(1).max(20),
});

/**
 * GET /api/youtube/metadata?videoId=xxx
 * Fetch YouTube video metadata (title, duration, thumbnail, channel)
 */
export const GET = withSimpleErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  const validationResult = metadataRequestSchema.safeParse({ videoId });

  if (!validationResult.success) {
    return ApiResponses.badRequest(
      "Invalid or missing videoId parameter",
      validationResult.error.errors
    );
  }

  const { videoId: validatedVideoId } = validationResult.data;
  const service = YouTubeMetadataService.getInstance();

  if (!service.isConfigured()) {
    return ApiResponses.serviceUnavailable(
      "YouTube API key not configured. Set YOUTUBE_API_KEY in .env"
    );
  }

  const metadata = await service.fetchMetadata(validatedVideoId);

  if (!metadata) {
    return ApiResponses.notFound("YouTube video metadata");
  }

  return ApiResponses.ok({
    success: true,
    metadata,
  });
}, LOG_CONTEXT);
