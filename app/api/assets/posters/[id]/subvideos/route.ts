import { z } from "zod";
import { PosterRepository } from "@/lib/repositories/PosterRepository";
import { SubVideoService } from "@/lib/services/SubVideoService";
import { endBehaviorSchema } from "@/lib/models/Poster";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[SubVideosAPI]";

/**
 * Schema for creating a new sub-video
 */
const createSubVideoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  startTime: z.number().min(0, "Start time must be non-negative"),
  endTime: z.number().min(0, "End time must be non-negative"),
  endBehavior: endBehaviorSchema,
  thumbnailUrl: z.string().nullable().optional(),
}).refine((data) => data.endTime > data.startTime, {
  message: "End time must be greater than start time",
  path: ["endTime"],
});

/**
 * GET /api/assets/posters/[id]/subvideos
 * List all sub-videos for a parent poster
 */
export const GET = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const posterRepo = PosterRepository.getInstance();
    const poster = posterRepo.getById(id);

    if (!poster) {
      return ApiResponses.notFound("Poster");
    }

    // Check if this poster is a sub-video itself (should query parent instead)
    if (poster.parentPosterId) {
      return ApiResponses.badRequest(
        "Cannot list sub-videos of a sub-video. Use the parent poster ID instead."
      );
    }

    // Get all sub-videos for this parent
    const subVideos = posterRepo.getSubVideos(id);

    return ApiResponses.ok({
      subVideos,
      count: subVideos.length,
      parentPoster: {
        id: poster.id,
        title: poster.title,
        type: poster.type,
        duration: poster.duration,
      },
    });
  },
  LOG_CONTEXT
);

/**
 * POST /api/assets/posters/[id]/subvideos
 * Create a new sub-video from a parent poster
 */
export const POST = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await request.json();

    // Validate input
    const parseResult = createSubVideoSchema.safeParse(body);
    if (!parseResult.success) {
      return ApiResponses.badRequest(
        "Invalid sub-video data",
        parseResult.error.flatten()
      );
    }

    const { title, startTime, endTime, endBehavior, thumbnailUrl } = parseResult.data;

    const posterRepo = PosterRepository.getInstance();
    const parentPoster = posterRepo.getById(id);

    if (!parentPoster) {
      return ApiResponses.notFound("Parent poster");
    }

    // Check if this poster is already a sub-video
    if (parentPoster.parentPosterId) {
      return ApiResponses.badRequest(
        "Cannot create sub-videos from a sub-video. Use the parent poster ID instead."
      );
    }

    // Check if poster is a video type
    if (parentPoster.type !== "video" && parentPoster.type !== "youtube") {
      return ApiResponses.badRequest(
        `Parent poster must be a video type. Got: ${parentPoster.type}`
      );
    }

    // Validate time range against parent duration if available
    if (parentPoster.duration !== null) {
      if (endTime > parentPoster.duration) {
        return ApiResponses.badRequest(
          `End time (${endTime}s) exceeds parent video duration (${parentPoster.duration}s)`
        );
      }
    }

    try {
      const subVideoService = SubVideoService.getInstance();
      const subVideo = subVideoService.createSubVideo({
        parentPosterId: id,
        title,
        startTime,
        endTime,
        endBehavior,
        thumbnailUrl,
      });

      return ApiResponses.created({
        subVideo,
        message: `Sub-video "${title}" created successfully`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create sub-video";
      return ApiResponses.badRequest(message);
    }
  },
  LOG_CONTEXT
);
