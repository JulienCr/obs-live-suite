import { v4 as uuidv4 } from "uuid";
import { Logger } from "../utils/Logger";
import { DatabaseService } from "./DatabaseService";
import {
  WikipediaSource,
  type CachedResult,
  type WikipediaCacheEntry,
} from "../models/Wikipedia";

/**
 * WikipediaCacheService provides two-tier caching for Wikipedia summaries
 * - In-memory LRU cache for fast access
 * - SQLite persistence for durability
 */
export class WikipediaCacheService {
  private static instance: WikipediaCacheService;
  private logger: Logger;
  private db: DatabaseService;
  private memoryCache: Map<string, CachedResult>;
  private readonly MAX_MEMORY_ENTRIES = 100;
  private readonly DEFAULT_TTL = 604800; // 7 days in seconds

  private constructor() {
    this.logger = new Logger("WikipediaCacheService");
    this.db = DatabaseService.getInstance();
    this.memoryCache = new Map();
    
    // Schedule periodic cleanup every 6 hours
    setInterval(() => this.cleanup(), 6 * 60 * 60 * 1000);
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): WikipediaCacheService {
    if (!WikipediaCacheService.instance) {
      WikipediaCacheService.instance = new WikipediaCacheService();
    }
    return WikipediaCacheService.instance;
  }

  /**
   * Get cached result for a query
   * Checks memory first, then SQLite
   */
  async get(query: string, lang: string = "fr"): Promise<CachedResult | null> {
    const cacheKey = this.getCacheKey(query, lang);

    // Check in-memory cache first
    const memoryResult = this.memoryCache.get(cacheKey);
    if (memoryResult) {
      // Check if expired
      if (this.isExpired(memoryResult.timestamp, this.DEFAULT_TTL)) {
        this.logger.info(`Memory cache entry expired for: ${query}`);
        this.memoryCache.delete(cacheKey);
      } else {
        this.logger.info(`Memory cache hit for: ${query}`);
        return memoryResult;
      }
    }

    // Check SQLite cache
    try {
      const stmt = this.db.getDb().prepare(`
        SELECT * FROM wikipedia_cache 
        WHERE query = ? AND lang = ? 
        LIMIT 1
      `);
      const row = stmt.get(query, lang) as WikipediaCacheEntry | undefined;

      if (row) {
        // Check if expired
        if (this.isExpired(row.created_at, row.ttl)) {
          this.logger.info(`SQLite cache entry expired for: ${query}`);
          // Delete expired entry
          this.db.getDb().prepare("DELETE FROM wikipedia_cache WHERE id = ?").run(row.id);
          return null;
        }

        this.logger.info(`SQLite cache hit for: ${query}`);

        // Parse summary JSON
        const summary = JSON.parse(row.summary) as string[];

        const cachedResult: CachedResult = {
          summary,
          thumbnail: row.thumbnail || undefined,
          timestamp: row.created_at,
          source: row.source as WikipediaSource,
          title: row.title,
          rawExtract: row.raw_extract || undefined, // Add rawExtract from DB
        };

        // Load into memory cache
        this.addToMemoryCache(cacheKey, cachedResult);

        return cachedResult;
      }

      this.logger.info(`Cache miss for: ${query}`);
      return null;
    } catch (error) {
      this.logger.error("Error reading from cache:", error);
      return null;
    }
  }

  /**
   * Set cached result for a query
   * Saves to both memory and SQLite
   */
  async set(
    query: string,
    result: CachedResult,
    lang: string = "fr",
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    const cacheKey = this.getCacheKey(query, lang);

    // Add to memory cache
    this.addToMemoryCache(cacheKey, result);

    // Add to SQLite
    try {
      const entry: WikipediaCacheEntry = {
        id: uuidv4(),
        query,
        lang,
        title: result.title,
        summary: JSON.stringify(result.summary),
        thumbnail: result.thumbnail || null,
        source: result.source,
        created_at: result.timestamp,
        ttl,
      };

      const stmt = this.db.getDb().prepare(`
        INSERT INTO wikipedia_cache (
          id, query, lang, title, summary, thumbnail, source, created_at, ttl, raw_extract
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        entry.id,
        entry.query,
        entry.lang,
        entry.title,
        entry.summary,
        entry.thumbnail,
        entry.source,
        entry.created_at,
        entry.ttl,
        result.rawExtract || null
      );

      this.logger.info(`Cached result for: ${query}`);
    } catch (error) {
      this.logger.error("Error writing to cache:", error);
      // Don't throw - memory cache is still working
    }
  }

  /**
   * Invalidate cache for a specific query
   */
  async invalidate(query: string, lang: string = "fr"): Promise<void> {
    const cacheKey = this.getCacheKey(query, lang);

    // Remove from memory
    this.memoryCache.delete(cacheKey);

    // Remove from SQLite
    try {
      const stmt = this.db.getDb().prepare(`
        DELETE FROM wikipedia_cache 
        WHERE query = ? AND lang = ?
      `);
      stmt.run(query, lang);

      this.logger.info(`Invalidated cache for: ${query}`);
    } catch (error) {
      this.logger.error("Error invalidating cache:", error);
    }
  }

  /**
   * Clean up expired entries from SQLite
   * Returns number of deleted entries
   */
  async cleanup(): Promise<number> {
    try {
      const now = Date.now() / 1000; // Convert to seconds

      const stmt = this.db.getDb().prepare(`
        DELETE FROM wikipedia_cache 
        WHERE (created_at + ttl) < ?
      `);

      const result = stmt.run(now);
      const deletedCount = result.changes;

      if (deletedCount > 0) {
        this.logger.info(`Cleaned up ${deletedCount} expired cache entries`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error("Error during cache cleanup:", error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number;
    sqliteEntries: number;
    oldestEntry: number | null;
  }> {
    try {
      const countStmt = this.db.getDb().prepare(`
        SELECT COUNT(*) as count FROM wikipedia_cache
      `);
      const countRow = countStmt.get() as { count: number };

      const oldestStmt = this.db.getDb().prepare(`
        SELECT MIN(created_at) as oldest FROM wikipedia_cache
      `);
      const oldestRow = oldestStmt.get() as { oldest: number | null };

      return {
        memoryEntries: this.memoryCache.size,
        sqliteEntries: countRow.count,
        oldestEntry: oldestRow.oldest,
      };
    } catch (error) {
      this.logger.error("Error getting cache stats:", error);
      return {
        memoryEntries: this.memoryCache.size,
        sqliteEntries: 0,
        oldestEntry: null,
      };
    }
  }

  /**
   * Clear all caches (memory + SQLite)
   */
  async clearAll(): Promise<void> {
    // Clear memory
    this.memoryCache.clear();

    // Clear SQLite
    try {
      const stmt = this.db.getDb().prepare("DELETE FROM wikipedia_cache");
      stmt.run();
      this.logger.info("All caches cleared");
    } catch (error) {
      this.logger.error("Error clearing cache:", error);
    }
  }

  /**
   * Generate cache key from query and language
   */
  private getCacheKey(query: string, lang: string): string {
    return `${query.toLowerCase().trim()}:${lang}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(timestamp: number, ttl: number): boolean {
    const now = Date.now() / 1000; // Convert to seconds
    const timestampSeconds = timestamp > 10000000000 ? timestamp / 1000 : timestamp;
    return now - timestampSeconds > ttl;
  }

  /**
   * Add entry to memory cache with LRU eviction
   */
  private addToMemoryCache(key: string, result: CachedResult): void {
    // If cache is full, remove oldest entry (first in Map)
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    // Add new entry (will be at the end of Map)
    this.memoryCache.set(key, result);
  }
}

