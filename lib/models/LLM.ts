import { z } from "zod";

/**
 * LLM summarization request schema
 */
export const llmSummarizeRequestSchema = z.object({
  text: z.string().min(50, "Text must be at least 50 characters").max(10000, "Text must be less than 10000 characters"),
});

export type LLMSummarizeRequest = z.infer<typeof llmSummarizeRequestSchema>;

/**
 * LLM summarization response schema
 */
export const llmSummarizeResponseSchema = z.union([
  z.object({
    success: z.literal(true),
    data: z.object({
      summary: z.array(z.string()).min(1).max(5),
    }),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    code: z.enum([
      "INVALID_INPUT",
      "LLM_ERROR",
      "RATE_LIMIT",
      "TIMEOUT",
    ]),
  }),
]);

export type LLMSummarizeResponse = z.infer<typeof llmSummarizeResponseSchema>;


