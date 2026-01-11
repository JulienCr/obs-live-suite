import { z } from "zod";

/**
 * Wikipedia query request schema
 */
export const wikipediaQuerySchema = z.object({
  query: z.string().min(2).max(200),
  forceRefresh: z.boolean().optional().default(false),
});

export type WikipediaQuery = z.infer<typeof wikipediaQuerySchema>;

/**
 * Wikipedia resolution source
 */
export enum WikipediaSource {
  DIRECT = "direct",
  WIKIDATA = "wikidata",
  CACHE = "cache",
}

/**
 * Wikipedia summary result schema
 */
export const wikipediaSummarySchema = z.object({
  query: z.string(),
  title: z.string(),
  summary: z.array(z.string()).min(1).max(5),
  thumbnail: z.string().url().optional(),
  source: z.nativeEnum(WikipediaSource),
  cached: z.boolean(),
  rawExtract: z.string().optional(), // Raw Wikipedia extract
  url: z.string().url().optional(), // Wikipedia page URL
});

export type WikipediaSummary = z.infer<typeof wikipediaSummarySchema>;

/**
 * Wikipedia API response schema
 */
export const wikipediaApiResponseSchema = z.union([
  z.object({
    success: z.literal(true),
    data: wikipediaSummarySchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    code: z.enum([
      "NOT_FOUND",
      "AMBIGUOUS",
      "TIMEOUT",
      "RATE_LIMIT",
      "LLM_ERROR",
      "INVALID_INPUT",
    ]),
  }),
]);

export type WikipediaApiResponse = z.infer<typeof wikipediaApiResponseSchema>;

/**
 * Wikipedia resolve request schema (for /api/wikipedia/resolve)
 */
export const wikipediaResolveRequestSchema = z.object({
  query: z.string().min(2).max(200),
  title: z.string().optional(),
});

export type WikipediaResolveRequest = z.infer<typeof wikipediaResolveRequestSchema>;

/**
 * Wikipedia resolve response schema (returns raw extract without LLM summarization)
 */
export const wikipediaResolveResponseSchema = z.union([
  z.object({
    success: z.literal(true),
    data: z.object({
      title: z.string(),
      extract: z.string(),
      thumbnail: z.string().url().optional(),
      url: z.string().url(),
      source: z.nativeEnum(WikipediaSource),
    }),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    code: z.enum([
      "NOT_FOUND",
      "TIMEOUT",
      "RATE_LIMIT",
      "INVALID_INPUT",
    ]),
  }),
]);

export type WikipediaResolveResponse = z.infer<typeof wikipediaResolveResponseSchema>;

/**
 * Wikipedia cache entry schema
 */
export const wikipediaCacheEntrySchema = z.object({
  id: z.string().uuid(),
  query: z.string(),
  lang: z.string().default("fr"),
  title: z.string(),
  summary: z.string(), // JSON stringified array
  thumbnail: z.string().nullable(),
  source: z.nativeEnum(WikipediaSource),
  created_at: z.number(),
  ttl: z.number().default(604800), // 7 days in seconds
  raw_extract: z.string().nullable().optional(), // Raw Wikipedia extract
});

export type WikipediaCacheEntry = z.infer<typeof wikipediaCacheEntrySchema>;

/**
 * In-memory cache entry
 */
export interface CachedResult {
  summary: string[];
  thumbnail?: string;
  timestamp: number;
  source: WikipediaSource;
  title: string;
  rawExtract?: string; // Raw Wikipedia extract
}

/**
 * Wikidata pattern detection
 */
export interface WikidataPattern {
  type: string;
  entity: string;
  property: string;
}

export const wikidataPatterns: Record<string, string> = {
  capitale: "P36",
  président: "P35",
  population: "P1082",
  superficie: "P2046",
  monnaie: "P38",
  langue: "P37",
};

/**
 * Wikipedia search result (for multiple results)
 */
export interface WikipediaSearchResult {
  title: string;
  snippet: string;
  pageid: number;
  wordcount?: number;
}

/**
 * MediaWiki API search response
 */
export interface MediaWikiSearchResponse {
  query?: {
    search: Array<{
      title: string;
      snippet: string;
      pageid: number;
      wordcount?: number;
    }>;
  };
}

/**
 * MediaWiki API page/revision response
 */
export interface MediaWikiPageResponse {
  query?: {
    pages: Record<string, {
      pageid: number;
      title: string;
      revisions?: Array<{
        '*': string;
      }>;
    }>;
  };
}

/**
 * Wikipedia REST API summary response
 */
export interface WikipediaRestSummaryResponse {
  title: string;
  extract?: string;
  thumbnail?: { source: string };
  originalimage?: { source: string };
}

/**
 * Wikibase SDK instance type (wikibase-sdk)
 */
export interface WikibaseSDK {
  sparqlQuery: (sparql: string) => string;
  simplify: {
    sparqlResults: <T>(data: unknown) => T[];
  };
}

/**
 * SPARQL query result item
 */
export interface SparqlResultItem {
  item?: string;
  itemLabel?: string;
  value?: string | number;
}

/**
 * Custom error types
 */
export class WikipediaNotFoundError extends Error {
  constructor(query: string) {
    super(`No Wikipedia page found for query: ${query}`);
    this.name = "WikipediaNotFoundError";
  }
}

export class WikipediaAmbiguousError extends Error {
  constructor(query: string) {
    super(`Ambiguous query, multiple results found: ${query}`);
    this.name = "WikipediaAmbiguousError";
  }
}

export class WikipediaTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WikipediaTimeoutError";
  }
}

export class InvalidSummaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSummaryError";
  }
}

export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaError";
  }
}

