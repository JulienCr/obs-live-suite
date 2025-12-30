/**
 * Rate limiter using token bucket algorithm
 * Supports per-key rate limiting (e.g., per IP, per session)
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiterService {
  private static instance: RateLimiterService;
  private buckets: Map<string, TokenBucket>;

  private constructor() {
    this.buckets = new Map();
    
    // Cleanup old buckets every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  /**
   * Check if request is within rate limit
   * @param key - Unique identifier (e.g., IP address, session ID)
   * @param limit - Maximum number of requests allowed
   * @param window - Time window in seconds
   * @returns true if within limit, false if rate limit exceeded
   */
  checkLimit(key: string, limit: number, window: number): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket) {
      // First request for this key
      this.buckets.set(key, {
        tokens: limit - 1,
        lastRefill: now,
      });
      return true;
    }

    // Calculate how many tokens to refill based on time passed
    const timePassed = (now - bucket.lastRefill) / 1000; // in seconds
    const tokensToAdd = Math.floor((timePassed / window) * limit);

    if (tokensToAdd > 0) {
      // Refill tokens
      bucket.tokens = Math.min(limit, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Check if we have tokens available
    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Get remaining tokens for a key
   */
  getRemaining(key: string, limit: number): number {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return limit;
    }
    return bucket.tokens;
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Cleanup old buckets that haven't been used in the last hour
   */
  private cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.lastRefill < oneHourAgo) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Get total number of tracked keys (for monitoring)
   */
  getTrackedCount(): number {
    return this.buckets.size;
  }
}

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  WIKIPEDIA: {
    limit: 10,
    window: 60, // 10 requests per minute
  },
  OLLAMA: {
    limit: 5,
    window: 60, // 5 requests per minute
  },
  GENERAL: {
    limit: 30,
    window: 60, // 30 requests per minute
  },
} as const;



