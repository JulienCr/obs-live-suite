import { z } from "zod";
import { PosterRepository } from "@/lib/repositories/PosterRepository";
import { VideoChapter } from "@/lib/models/Poster";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ChaptersAPI]";

/**
 * Route params type
 */
type ChapterRouteParams = { id: string; chapterId: string };

/**
 * Schema for updating a chapter
 */
const updateChapterSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less").optional(),
  timestamp: z.number().min(0, "Timestamp must be non-negative").optional(),
});

/**
 * GET /api/assets/posters/[id]/chapters/[chapterId]
 * Get a specific chapter by ID
 */
export const GET = withErrorHandler<ChapterRouteParams>(
  async (_request: Request, context: RouteContext<ChapterRouteParams>) => {
    const { id, chapterId } = await context.params;
    const posterRepo = PosterRepository.getInstance();
    const poster = posterRepo.getById(id);

    if (!poster) {
      return ApiResponses.notFound("Poster");
    }

    const chapters: VideoChapter[] = (poster.metadata?.chapters as VideoChapter[]) || [];
    const chapter = chapters.find((ch) => ch.id === chapterId);

    if (!chapter) {
      return ApiResponses.notFound("Chapter");
    }

    return ApiResponses.ok({ chapter });
  },
  LOG_CONTEXT
);

/**
 * PATCH /api/assets/posters/[id]/chapters/[chapterId]
 * Update a chapter by ID
 */
export const PATCH = withErrorHandler<ChapterRouteParams>(
  async (request: Request, context: RouteContext<ChapterRouteParams>) => {
    const { id, chapterId } = await context.params;
    const body = await request.json();

    // Validate input
    const parseResult = updateChapterSchema.safeParse(body);
    if (!parseResult.success) {
      return ApiResponses.badRequest(
        "Invalid chapter data",
        parseResult.error.flatten()
      );
    }

    const updates = parseResult.data;

    // Check if there are any updates
    if (updates.title === undefined && updates.timestamp === undefined) {
      return ApiResponses.badRequest("No update fields provided");
    }

    const posterRepo = PosterRepository.getInstance();
    const poster = posterRepo.getById(id);

    if (!poster) {
      return ApiResponses.notFound("Poster");
    }

    const chapters: VideoChapter[] = (poster.metadata?.chapters as VideoChapter[]) || [];
    const chapterIndex = chapters.findIndex((ch) => ch.id === chapterId);

    if (chapterIndex === -1) {
      return ApiResponses.notFound("Chapter");
    }

    // Check for duplicate timestamp if timestamp is being updated
    if (updates.timestamp !== undefined) {
      const duplicateTimestamp = chapters.find(
        (ch, idx) =>
          idx !== chapterIndex &&
          Math.abs(ch.timestamp - updates.timestamp!) < 1
      );
      if (duplicateTimestamp) {
        return ApiResponses.conflict(
          `A chapter already exists near timestamp ${updates.timestamp}s`
        );
      }
    }

    // Update the chapter
    const updatedChapter: VideoChapter = {
      ...chapters[chapterIndex],
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.timestamp !== undefined && { timestamp: updates.timestamp }),
    };

    // Replace the chapter in the array
    const updatedChapters = [...chapters];
    updatedChapters[chapterIndex] = updatedChapter;

    // Update poster metadata
    const updatedMetadata = {
      ...poster.metadata,
      chapters: updatedChapters,
    };

    posterRepo.update(id, {
      metadata: updatedMetadata,
      updatedAt: new Date(),
    });

    // Sort chapters by timestamp for response
    const sortedChapters = updatedChapters.sort((a, b) => a.timestamp - b.timestamp);

    return ApiResponses.ok({
      chapter: updatedChapter,
      chapters: sortedChapters,
    });
  },
  LOG_CONTEXT
);

/**
 * DELETE /api/assets/posters/[id]/chapters/[chapterId]
 * Delete a chapter by ID
 */
export const DELETE = withErrorHandler<ChapterRouteParams>(
  async (_request: Request, context: RouteContext<ChapterRouteParams>) => {
    const { id, chapterId } = await context.params;
    const posterRepo = PosterRepository.getInstance();
    const poster = posterRepo.getById(id);

    if (!poster) {
      return ApiResponses.notFound("Poster");
    }

    const chapters: VideoChapter[] = (poster.metadata?.chapters as VideoChapter[]) || [];
    const chapterIndex = chapters.findIndex((ch) => ch.id === chapterId);

    if (chapterIndex === -1) {
      return ApiResponses.notFound("Chapter");
    }

    // Remove the chapter
    const updatedChapters = chapters.filter((ch) => ch.id !== chapterId);

    // Update poster metadata
    const updatedMetadata = {
      ...poster.metadata,
      chapters: updatedChapters,
    };

    posterRepo.update(id, {
      metadata: updatedMetadata,
      updatedAt: new Date(),
    });

    // Sort remaining chapters by timestamp for response
    const sortedChapters = updatedChapters.sort((a, b) => a.timestamp - b.timestamp);

    return ApiResponses.ok({
      success: true,
      chapters: sortedChapters,
    });
  },
  LOG_CONTEXT
);
