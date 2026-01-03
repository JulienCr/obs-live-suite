import wikiModule from "wikipedia";
import type { wikiSummary, wikiSearchResult } from "wikipedia";
import wtf from "wtf_wikipedia";
import {
  WikipediaNotFoundError,
  WikipediaTimeoutError,
  WikipediaSource,
  WikipediaSearchResult,
  MediaWikiSearchResponse,
  MediaWikiPageResponse,
  WikipediaRestSummaryResponse,
  WikibaseSDK,
  WikidataPattern,
  SparqlResultItem,
  wikidataPatterns as wikidataPatternsData,
} from "../models/Wikipedia";
import { Logger } from "../utils/Logger";
import { cleanWikipediaContent } from "../utils/textProcessing";

// Conditional imports for Wikidata support
let wdk: WikibaseSDK | null = null;
let wikidataPatterns: Record<string, string> | null = null;

// Configuration constants
const MAX_SECTIONS = 3; // Intro + 2 first sections
const DISABLE_WIKIDATA_FALLBACK = true;

// Only import Wikidata dependencies if not disabled
if (!DISABLE_WIKIDATA_FALLBACK) {
  const wdkModule = await import("wikibase-sdk/wikidata.org");
  wdk = wdkModule.default as WikibaseSDK;
  wikidataPatterns = wikidataPatternsData;
}

// Handle ESM/CJS interop - wikipedia package exports default differently
const wiki = (wikiModule as any).default || wikiModule;

/**
 * Result from Wikipedia resolution and fetch
 */
export interface WikipediaResult {
  title: string;
  extract: string;
  thumbnail?: string;
  source: WikipediaSource;
}

/**
 * WikipediaResolverService handles Wikipedia page resolution and content fetching
 * Supports direct Wikipedia search and Wikidata fallback for relational queries
 */
export class WikipediaResolverService {
  private static instance: WikipediaResolverService;
  private logger: Logger;
  private readonly TIMEOUT_MS = 5000;


  private constructor() {
    this.logger = new Logger("WikipediaResolverService");
    // Set User-Agent for wikipedia package to avoid 403 errors
    wiki.setUserAgent('OBSLiveSuite/1.0 (https://github.com/obs-live-suite)');
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): WikipediaResolverService {
    if (!WikipediaResolverService.instance) {
      WikipediaResolverService.instance = new WikipediaResolverService();
    }
    return WikipediaResolverService.instance;
  }

  /**
   * Main entry point: resolve query and fetch Wikipedia content
   */
  async resolveAndFetch(query: string): Promise<WikipediaResult> {
    this.logger.info(`Resolving query: ${query}`);

    try {
      // Try direct Wikipedia search first
      return await this.directWikipediaSearch(query);
    } catch (error) {
      // If Wikidata fallback is disabled, re-throw the error
      if (DISABLE_WIKIDATA_FALLBACK) {
        this.logger.error(`Direct Wikipedia search failed for "${query}" (Wikidata fallback disabled)`);
        throw error;
      }

      this.logger.warn(
        `Direct Wikipedia search failed for "${query}", trying Wikidata fallback...`,
        error
      );

      // Try Wikidata fallback for relational queries
      return await this.wikidataFallback(query);
    }
  }

  /**
   * Search Wikipedia and return multiple options (for user selection)
   */
  async searchMultiple(query: string, limit: number = 5): Promise<WikipediaSearchResult[]> {
    this.logger.info(`Searching multiple Wikipedia results for: "${query}"`);

    try {
      // Try wikipedia package first
      wiki.setLang('fr');
      const searchResults: wikiSearchResult = await wiki.search(query, { limit });

      if (!searchResults.results || searchResults.results.length === 0) {
        // Fallback to MediaWiki API
        return await this.searchMultipleWithMediaWikiAPI(query, limit);
      }

      return searchResults.results.map((result) => ({
        title: result.title,
        snippet: result.description || "",
        pageid: result.pageid,
        wordcount: result.wordcount,
      }));
    } catch (error) {
      this.logger.warn("Wikipedia package search failed, trying MediaWiki API...", error);
      return await this.searchMultipleWithMediaWikiAPI(query, limit);
    }
  }

  /**
   * Search multiple results using MediaWiki API
   */
  private async searchMultipleWithMediaWikiAPI(query: string, limit: number = 5): Promise<WikipediaSearchResult[]> {
    try {
      const searchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'OBSLiveSuite/1.0 (https://github.com/obs-live-suite)',
        },
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`MediaWiki API returned ${response.status}`);
      }

      const data = await response.json() as MediaWikiSearchResponse;

      if (!data.query || !data.query.search || data.query.search.length === 0) {
        return [];
      }

      return data.query.search.map((result) => ({
        title: result.title,
        snippet: result.snippet?.replace(/<[^>]*>/g, '') || "", // Strip HTML tags
        pageid: result.pageid,
        wordcount: result.wordcount,
      }));
    } catch (error) {
      this.logger.error("MediaWiki API search error:", error);
      return [];
    }
  }

  /**
   * Fetch a specific Wikipedia page by title
   */
  async fetchByTitle(title: string): Promise<WikipediaResult> {
    this.logger.info(`Fetching Wikipedia page: "${title}"`);

    try {
      // Try wikipedia package with wtf_wikipedia parser
      wiki.setLang('fr');

      // Get page and full wikitext content
      const page = await wiki.page(title);
      const fullContent = await page.content();

      // Convert content sections to wikitext string
      // Take intro + first sections up to MAX_SECTIONS
      let wikitext = '';
      let sectionsAdded = 0;

      for (const section of fullContent) {
        if (sectionsAdded >= MAX_SECTIONS) break;

        // Skip navigation/reference sections
        const skipTitles = ['voir aussi', 'notes et références', 'articles connexes', 'liens externes', 'bibliographie'];
        if (section.title && skipTitles.some(skip => section.title.toLowerCase().includes(skip))) {
          continue;
        }

        // Add section content
        if (section.content) {
          wikitext += section.content + '\n\n';
          sectionsAdded++;
        }

        // Add subsections content (but count them toward the total)
        if (section.items) {
          for (const item of section.items) {
            if (sectionsAdded >= MAX_SECTIONS) break;
            if (item.content) {
              wikitext += item.content + '\n\n';
              sectionsAdded++;
            }
          }
        }
      }

      this.logger.info(`Extracted ${sectionsAdded} sections from "${title}"`);

      // Parse wikitext with wtf_wikipedia to get clean text
      const doc = wtf(wikitext);
      let cleanText = doc.text();

      // Get summary for thumbnail
      const summary: wikiSummary = await wiki.summary(title);

      // Defense-in-depth: additional cleaning (no length limit - we truncate later with truncateToTokenLimit)
      const cleanedContent = cleanWikipediaContent(cleanText, Number.MAX_SAFE_INTEGER);

      return {
        title: summary.title,
        extract: this.truncateToTokenLimit(cleanedContent, 25000), // ~10k tokens
        thumbnail: summary.thumbnail?.source || summary.originalimage?.source,
        source: WikipediaSource.DIRECT,
      };
    } catch (error) {
      this.logger.warn("Wikipedia package unavailable, using MediaWiki API fallback...");
      return await this.fetchByTitleWithMediaWikiAPI(title);
    }
  }

  /**
   * Fetch page by title using MediaWiki REST API + wtf_wikipedia parser
   */
  private async fetchByTitleWithMediaWikiAPI(title: string): Promise<WikipediaResult> {
    try {
      // Get summary for metadata
      const summaryUrl = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

      const summaryResponse = await fetch(summaryUrl, {
        headers: {
          'User-Agent': 'OBSLiveSuite/1.0 (https://github.com/obs-live-suite)',
        },
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!summaryResponse.ok) {
        throw new WikipediaNotFoundError(title);
      }

      const summaryData = await summaryResponse.json() as WikipediaRestSummaryResponse;

      // Fetch wikitext from Action API
      let cleanText = summaryData.extract || "";

      try {
        const wikitextUrl = `https://fr.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=${encodeURIComponent(title)}&origin=*`;

        const wikitextResponse = await fetch(wikitextUrl, {
          headers: {
            'User-Agent': 'OBSLiveSuite/1.0 (https://github.com/obs-live-suite)',
          },
          signal: AbortSignal.timeout(this.TIMEOUT_MS),
        });

        if (wikitextResponse.ok) {
          const wikitextData = await wikitextResponse.json() as MediaWikiPageResponse;
          const pages = wikitextData.query?.pages;

          if (pages) {
            const pageId = Object.keys(pages)[0];
            const wikitext = pages[pageId]?.revisions?.[0]?.['*'];

            if (wikitext) {
              // Parse with wtf_wikipedia
              const doc = wtf(wikitext);

              // Get text from first MAX_SECTIONS sections
              const sections = doc.sections();
              let combinedText = '';
              let sectionsAdded = 0;

              for (let i = 0; i < sections.length && sectionsAdded < MAX_SECTIONS; i++) {
                const section = sections[i];
                // Skip navigation/reference sections
                const skipTitles = ['voir aussi', 'notes et références', 'articles connexes', 'liens externes', 'bibliographie'];
                const sectionTitle = section.title()?.toLowerCase() || '';

                if (!skipTitles.some(skip => sectionTitle.includes(skip))) {
                  const sectionText = section.text({ plaintext: true });
                  if (sectionText && sectionText.trim().length > 0) {
                    combinedText += sectionText + '\n\n';
                    sectionsAdded++;
                  }
                }
              }

              this.logger.info(`MediaWiki API: Extracted ${sectionsAdded} sections from wikitext`);

              if (combinedText.trim().length > 0) {
                cleanText = combinedText;
              }
            }
          }
        }
      } catch (wikitextError) {
        // If wikitext fetch fails, use summary only
        this.logger.warn(`Failed to fetch wikitext for "${title}":`, wikitextError);
      }

      // Defense-in-depth cleaning (no length limit - we truncate later with truncateToTokenLimit)
      const cleanedContent = cleanWikipediaContent(cleanText, Number.MAX_SAFE_INTEGER);

      this.logger.info(`MediaWiki API fallback succeeded for "${title}" (${cleanedContent.length} chars)`);

      return {
        title: summaryData.title,
        extract: this.truncateToTokenLimit(cleanedContent, 25000), // ~10k tokens
        thumbnail: summaryData.thumbnail?.source || summaryData.originalimage?.source,
        source: WikipediaSource.DIRECT,
      };
    } catch (error) {
      this.logger.error("MediaWiki API fetch error:", error);
      throw new WikipediaNotFoundError(title);
    }
  }

  /**
   * Truncate text to approximate token limit
   * Rough estimate: 1 token ≈ 4 characters for French
   */
  private truncateToTokenLimit(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4; // ~40k characters for 10k tokens

    if (text.length <= maxChars) {
      return text;
    }

    // Truncate at sentence boundary
    const truncated = text.substring(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');

    if (lastPeriod > maxChars * 0.8) {
      // If we find a period in the last 20%, use it
      return truncated.substring(0, lastPeriod + 1);
    }

    return truncated;
  }

  /**
   * Direct Wikipedia search using wikipedia npm package (primary)
   * Falls back to MediaWiki API if needed
   */
  private async directWikipediaSearch(query: string): Promise<WikipediaResult> {
    try {
      // Primary: Try wikipedia package
      return await this.searchWithWikipediaPackage(query);
    } catch (error) {
      this.logger.warn(`Wikipedia package failed, trying MediaWiki API fallback...`, error);

      // Fallback: Try direct MediaWiki API
      return await this.searchWithMediaWikiAPI(query);
    }
  }

  /**
   * Search using wikipedia npm package (primary method)
   */
  private async searchWithWikipediaPackage(query: string): Promise<WikipediaResult> {
    try {
      // Set language to French (synchronous, returns new URL)
      wiki.setLang('fr');

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new WikipediaTimeoutError("Wikipedia package search timed out")),
          this.TIMEOUT_MS
        );
      });

      // Step 1: Search for pages
      const searchPromise = wiki.search(query, { limit: 5 });
      const searchResults: wikiSearchResult = await Promise.race([searchPromise, timeoutPromise]);

      if (!searchResults.results || searchResults.results.length === 0) {
        throw new WikipediaNotFoundError(query);
      }

      const topResult = searchResults.results[0];
      this.logger.info(`Wikipedia package found ${searchResults.results.length} results, using: ${topResult.title}`);

      // Step 2: Get full page content
      return await this.fetchByTitle(topResult.title);
    } catch (error) {
      if (
        error instanceof WikipediaNotFoundError ||
        error instanceof WikipediaTimeoutError
      ) {
        throw error;
      }
      this.logger.error("Wikipedia package error:", error);
      throw new WikipediaNotFoundError(query);
    }
  }

  /**
   * Search using direct MediaWiki API (fallback method)
   */
  private async searchWithMediaWikiAPI(query: string): Promise<WikipediaResult> {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new WikipediaTimeoutError("MediaWiki API search timed out")),
          this.TIMEOUT_MS
        );
      });

      // Step 1: Search for pages using MediaWiki API
      const searchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&origin=*`;

      const searchPromise = fetch(searchUrl, {
        headers: {
          'User-Agent': 'OBSLiveSuite/1.0 (https://github.com/obs-live-suite)',
        },
      }).then(r => r.json() as Promise<MediaWikiSearchResponse>);

      const searchData = await Promise.race([searchPromise, timeoutPromise]);

      if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
        throw new WikipediaNotFoundError(query);
      }

      const topResult = searchData.query.search[0];
      const pageTitle = topResult.title;

      this.logger.info(`MediaWiki API found ${searchData.query.search.length} results, using: ${pageTitle}`);

      // Step 2: Fetch full content for this page
      return await this.fetchByTitleWithMediaWikiAPI(pageTitle);
    } catch (error) {
      if (
        error instanceof WikipediaNotFoundError ||
        error instanceof WikipediaTimeoutError
      ) {
        throw error;
      }
      this.logger.error("MediaWiki API error:", error);
      throw new WikipediaNotFoundError(query);
    }
  }

  /**
   * Wikidata fallback for relational queries (e.g., "capitale du Kenya")
   * Only available if DISABLE_WIKIDATA_FALLBACK = false
   */
  private async wikidataFallback(query: string): Promise<WikipediaResult> {
    if (DISABLE_WIKIDATA_FALLBACK) {
      throw new WikipediaNotFoundError(`Wikidata fallback is disabled`);
    }

    const pattern = this.detectPattern(query);

    if (!pattern) {
      this.logger.warn(`No recognized pattern in query: ${query}`);
      throw new WikipediaNotFoundError(query);
    }

    this.logger.info(
      `Detected pattern: ${pattern.type} for entity: ${pattern.entity}`
    );

    try {
      // Build SPARQL query
      const sparql = this.buildSparqlQuery(pattern);

      if (!wdk) {
        throw new Error("Wikibase SDK not initialized");
      }

      const url = wdk.sparqlQuery(sparql);

      // Fetch Wikidata results with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new WikipediaTimeoutError("Wikidata query timed out")),
          this.TIMEOUT_MS
        );
      });

      const fetchPromise = fetch(url).then((r) => r.json());
      const data = await Promise.race([fetchPromise, timeoutPromise]);

      const results = wdk.simplify.sparqlResults<SparqlResultItem>(data);

      if (results.length === 0) {
        throw new WikipediaNotFoundError(
          `No Wikidata result for ${pattern.type} of ${pattern.entity}`
        );
      }

      // Get the label from Wikidata
      const resultLabel = results[0].itemLabel || results[0].item;

      if (!resultLabel) {
        throw new WikipediaNotFoundError(
          `No label found in Wikidata result for ${pattern.type} of ${pattern.entity}`
        );
      }

      this.logger.info(`Wikidata resolved to: ${resultLabel}`);

      // Recursively fetch Wikipedia content for the resolved entity
      const result = await this.directWikipediaSearch(resultLabel);

      // Override source to indicate Wikidata resolution
      return {
        ...result,
        source: WikipediaSource.WIKIDATA,
      };
    } catch (error) {
      if (
        error instanceof WikipediaNotFoundError ||
        error instanceof WikipediaTimeoutError
      ) {
        throw error;
      }
      this.logger.error("Wikidata API error:", error);
      throw new WikipediaNotFoundError(query);
    }
  }

  /**
   * Detect relational query patterns in French
   * Returns pattern info or null if no pattern detected
   * Only available if DISABLE_WIKIDATA_FALLBACK = false
   */
  private detectPattern(query: string): WikidataPattern | null {
    if (DISABLE_WIKIDATA_FALLBACK || !wikidataPatterns) {
      return null;
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Check each pattern
    for (const [patternName, propertyId] of Object.entries(wikidataPatterns)) {
      const regex = new RegExp(`^${patternName}\\s+(?:de\\s+|d['']\\s*)(.+)$`, "i");
      const match = normalizedQuery.match(regex);

      if (match) {
        return {
          type: patternName,
          entity: match[1].trim(),
          property: propertyId,
        };
      }
    }

    return null;
  }

  /**
   * Build SPARQL query for Wikidata property lookup
   * Only available if DISABLE_WIKIDATA_FALLBACK = false
   */
  private buildSparqlQuery(pattern: WikidataPattern): string {
    if (DISABLE_WIKIDATA_FALLBACK) {
      throw new Error("Wikidata fallback is disabled");
    }

    // Special handling for different property types
    if (pattern.property === "P1082") {
      // Population - return the value directly, not another entity
      return `
        SELECT ?value WHERE {
          ?country rdfs:label "${pattern.entity}"@fr .
          ?country wdt:${pattern.property} ?value .
        } LIMIT 1
      `;
    }

    // Standard query for entity properties (capital, president, etc.)
    return `
      SELECT ?item ?itemLabel WHERE {
        ?country rdfs:label "${pattern.entity}"@fr .
        ?country wdt:${pattern.property} ?item .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "fr" }
      } LIMIT 1
    `;
  }

  /**
   * Test Wikipedia API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try wikipedia package first
      wiki.setLang('fr');
      const searchResults = await wiki.search('test', { limit: 1 });
      if (searchResults && searchResults.results) {
        return true;
      }
    } catch (error) {
      this.logger.warn("Wikipedia package connection test failed, trying MediaWiki API fallback...", error);
    }

    // Fallback to MediaWiki API
    try {
      const url = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=test&srlimit=1&format=json&origin=*`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OBSLiveSuite/1.0 (https://github.com/obs-live-suite)',
        },
      });
      return response.ok;
    } catch (error) {
      this.logger.error("Wikipedia connection test failed:", error);
      return false;
    }
  }
}

