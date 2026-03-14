import { PosterRepository } from "@/lib/repositories/PosterRepository";
import { getVideoDuration, urlToFilePath } from "@/lib/utils/fileUpload";
import { extractYouTubeId } from "@/lib/utils/urlDetection";
import { YouTubeMetadataService } from "@/lib/services/YouTubeMetadataService";
import { PosterType, isVideoPosterType } from "@/lib/models/Poster";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PostersAPI:Probe]";

/**
 * POST /api/assets/posters/[id]/probe
 * Re-extract video duration for an existing poster (video or YouTube)
 */
export const POST = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const posterRepo = PosterRepository.getInstance();
    const poster = posterRepo.getById(id);

    if (!poster) {
      return ApiResponses.notFound("Poster not found");
    }

    if (!isVideoPosterType(poster.type)) {
      return ApiResponses.badRequest("Not a video poster");
    }

    let duration: number | null = null;

    if (poster.type === PosterType.YOUTUBE) {
      const videoId = extractYouTubeId(poster.fileUrl);
      if (!videoId) {
        return ApiResponses.badRequest("Could not extract YouTube video ID");
      }
      const metadata = await YouTubeMetadataService.getInstance().fetchMetadata(videoId);
      if (!metadata?.duration) {
        console.error(`${LOG_CONTEXT} Failed to fetch YouTube duration for video ${videoId}`);
        return ApiResponses.badRequest(
          "Could not fetch YouTube video duration. Check that the YouTube API key is configured."
        );
      }
      duration = metadata.duration;
    } else {
      const filePath = urlToFilePath(poster.fileUrl);
      duration = await getVideoDuration(filePath);
    }

    if (duration === null) {
      console.error(`${LOG_CONTEXT} Failed to extract duration for poster ${id}`);
      return ApiResponses.badRequest(
        "Could not extract duration from video"
      );
    }

    posterRepo.update(id, { duration });

    return ApiResponses.ok({ duration });
  },
  LOG_CONTEXT
);
