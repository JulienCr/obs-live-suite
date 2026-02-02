import { DatabaseService } from "@/lib/services/DatabaseService";
import { getVideoDuration, urlToFilePath } from "@/lib/utils/fileUpload";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PostersAPI:Probe]";

/**
 * POST /api/assets/posters/[id]/probe
 * Re-extract video duration for an existing poster
 */
export const POST = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const db = DatabaseService.getInstance();
    const poster = db.getPosterById(id);

    if (!poster) {
      return ApiResponses.notFound("Poster not found");
    }

    if (poster.type !== "video") {
      return ApiResponses.badRequest("Not a video poster");
    }

    // YouTube videos cannot be probed
    if (
      poster.fileUrl.includes("youtube.com") ||
      poster.fileUrl.includes("youtu.be")
    ) {
      return ApiResponses.badRequest("Cannot probe YouTube videos");
    }

    const filePath = urlToFilePath(poster.fileUrl);
    const duration = await getVideoDuration(filePath);

    if (duration === null) {
      return ApiResponses.badRequest(
        "Could not extract duration from video file"
      );
    }

    db.updatePoster(id, { duration });

    return ApiResponses.ok({ duration });
  },
  LOG_CONTEXT
);
