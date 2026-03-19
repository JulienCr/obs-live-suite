import { TitleRevealRepository } from "@/lib/repositories/TitleRevealRepository";
import { createTitleRevealSchema } from "@/lib/models/TitleReveal";
import { randomUUID } from "crypto";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TitleRevealsAPI]";

/**
 * GET /api/assets/title-reveals
 * List all title reveals
 */
export const GET = withSimpleErrorHandler(async () => {
  const repo = TitleRevealRepository.getInstance();
  const titleReveals = repo.getAll();
  return ApiResponses.ok({ titleReveals });
}, LOG_CONTEXT);

/**
 * POST /api/assets/title-reveals
 * Create a new title reveal
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const parsed = createTitleRevealSchema.parse(body);
  const id = randomUUID();
  const now = new Date();
  const repo = TitleRevealRepository.getInstance();
  repo.create({
    id,
    ...parsed,
    createdAt: now,
    updatedAt: now,
  });
  const titleReveal = repo.getById(id);
  return ApiResponses.created({ titleReveal });
}, LOG_CONTEXT);
