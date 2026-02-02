import { randomUUID } from "crypto";
import { z } from "zod";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { videoChapterSchema, VideoChapter } from "@/lib/models/Poster";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ChaptersAPI]";

/**
 * Schema for creating a new chapter
 */
const createChapterSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  timestamp: z.number().min(0, "Timestamp must be non-negative"),
});

/**
 * GET /api/assets/posters/[id]/chapters
 * List all chapters for a poster
 */
export const GET = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const db = DatabaseService.getInstance();
    const poster = db.getPosterById(id);

    if (!poster) {
      return ApiResponses.notFound("Poster");
    }

    // Extract chapters from metadata, defaulting to empty array
    const chapters: VideoChapter[] = (poster.metadata?.chapters as VideoChapter[]) || [];

    // Sort chapters by timestamp
    const sortedChapters = [...chapters].sort((a, b) => a.timestamp - b.timestamp);

    return ApiResponses.ok({
      chapters: sortedChapters,
      count: sortedChapters.length,
    });
  },
  LOG_CONTEXT
);

/**
 * POST /api/assets/posters/[id]/chapters
 * Add a new chapter to a poster
 */
export const POST = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await request.json();

    // Validate input
    const parseResult = createChapterSchema.safeParse(body);
    if (!parseResult.success) {
      return ApiResponses.badRequest(
        "Invalid chapter data",
        parseResult.error.flatten()
      );
    }

    const db = DatabaseService.getInstance();
    const poster = db.getPosterById(id);

    if (!poster) {
      return ApiResponses.notFound("Poster");
    }

    // Create new chapter with UUID
    const newChapter: VideoChapter = {
      id: randomUUID(),
      title: parseResult.data.title,
      timestamp: parseResult.data.timestamp,
    };

    // Validate against schema
    const chapterValidation = videoChapterSchema.safeParse(newChapter);
    if (!chapterValidation.success) {
      return ApiResponses.badRequest(
        "Invalid chapter format",
        chapterValidation.error.flatten()
      );
    }

    // Get existing chapters or initialize empty array
    const existingChapters: VideoChapter[] = (poster.metadata?.chapters as VideoChapter[]) || [];

    // Check for duplicate timestamp (within 1 second tolerance)
    const duplicateTimestamp = existingChapters.find(
      (ch) => Math.abs(ch.timestamp - newChapter.timestamp) < 1
    );
    if (duplicateTimestamp) {
      return ApiResponses.conflict(
        `A chapter already exists near timestamp ${newChapter.timestamp}s`
      );
    }

    // Add new chapter
    const updatedChapters = [...existingChapters, newChapter];

    // Update poster metadata
    const updatedMetadata = {
      ...poster.metadata,
      chapters: updatedChapters,
    };

    db.updatePoster(id, {
      metadata: updatedMetadata,
      updatedAt: new Date(),
    });

    // Sort chapters by timestamp for response
    const sortedChapters = updatedChapters.sort((a, b) => a.timestamp - b.timestamp);

    return ApiResponses.created({
      chapter: newChapter,
      chapters: sortedChapters,
    });
  },
  LOG_CONTEXT
);
