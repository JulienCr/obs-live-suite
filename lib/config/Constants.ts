/**
 * Centralized constants for the OBS Live Suite application.
 * This file consolidates magic numbers found throughout the codebase
 * to improve maintainability and discoverability.
 */

// ============================================================================
// QUIZ SYSTEM CONSTANTS
// ============================================================================

/**
 * Quiz animation and timing constants.
 */
export const QUIZ = {
  /**
   * Default zoom animation duration in seconds.
   * Used by QuizZoomController for image_zoombuzz questions.
   * @see lib/services/QuizManager.ts
   */
  ZOOM_DURATION_SECONDS: 45,

  /**
   * Maximum zoom level for image_zoombuzz questions.
   * Represents 35x zoom at start, zooming out to 1x at end.
   * @see lib/services/QuizManager.ts
   */
  ZOOM_MAX_LEVEL: 35,

  /**
   * Default frames per second for zoom animation.
   * Used to calculate steps and interval from duration.
   * @see lib/services/QuizZoomController.ts
   */
  ZOOM_FPS: 30,

  /**
   * Default interval in milliseconds between mystery image square reveals.
   * @see lib/services/QuizMysteryImageController.ts
   */
  MYSTERY_IMAGE_INTERVAL_MS: 60,

  /**
   * Default question timer duration in seconds.
   * Used when question doesn't specify time_s.
   * @see lib/services/QuizManager.ts
   */
  DEFAULT_TIMER_SECONDS: 20,

  /**
   * Maximum text length for open-ended quiz answers (!rep command).
   * Truncates viewer responses to prevent abuse.
   * @see server/api/quiz-bot.ts
   */
  OPEN_ANSWER_MAX_LENGTH: 200,
} as const;

// ============================================================================
// BUZZER SYSTEM CONSTANTS
// ============================================================================

/**
 * Quiz buzzer timing constants.
 */
export const BUZZER = {
  /**
   * Debounce delay in milliseconds after a buzz hit.
   * Prevents rapid-fire accidental double buzzes.
   * @see lib/services/QuizBuzzerService.ts
   */
  LOCK_DELAY_MS: 300,

  /**
   * Window in milliseconds during which a steal is allowed.
   * Only applies when steal mode is enabled.
   * @see lib/services/QuizBuzzerService.ts
   */
  STEAL_WINDOW_MS: 4000,
} as const;

// ============================================================================
// VIEWER INPUT LIMITS
// ============================================================================

/**
 * Rate limiting constants for viewer quiz participation.
 */
export const VIEWER_LIMITS = {
  /**
   * Cooldown in milliseconds between a single user's submissions.
   * Prevents spam from individual users.
   * @see server/api/quiz-bot.ts
   */
  PER_USER_COOLDOWN_MS: 1500,

  /**
   * Maximum number of attempts per user per question.
   * Limits answer changes to prevent abuse.
   * @see server/api/quiz-bot.ts
   */
  PER_USER_MAX_ATTEMPTS: 5,

  /**
   * Global rate limit in requests per second.
   * Protects against coordinated spam attacks.
   * @see server/api/quiz-bot.ts
   */
  GLOBAL_RPS: 50,
} as const;

// ============================================================================
// WEBSOCKET CONSTANTS
// ============================================================================

/**
 * WebSocket connection and heartbeat constants.
 */
export const WEBSOCKET = {
  /**
   * Interval in milliseconds between WebSocket ping/pong heartbeats.
   * Used to detect dead connections.
   * @see lib/services/WebSocketHub.ts
   */
  HEARTBEAT_INTERVAL_MS: 30000,

  /**
   * Timeout in milliseconds to wait for overlay acknowledgment.
   * Logs a warning if overlay doesn't respond in time.
   * @see lib/services/ChannelManager.ts
   */
  ACK_TIMEOUT_MS: 5000,
} as const;

// ============================================================================
// DATABASE CONSTANTS
// ============================================================================

/**
 * Database buffer and retention constants.
 */
export const DATABASE = {
  /**
   * Maximum number of Streamer.bot chat messages to retain.
   * Older messages are automatically purged (rolling buffer).
   * @see lib/services/DatabaseService.ts
   */
  CHAT_BUFFER_SIZE: 200,

  /**
   * Default number of cue messages to retain per room.
   * Used by deleteOldMessages cleanup.
   * @see lib/services/DatabaseService.ts
   */
  CUE_MESSAGE_KEEP_COUNT: 100,

  /**
   * Default Wikipedia cache TTL in seconds (7 days).
   * @see lib/services/DatabaseService.ts
   */
  WIKIPEDIA_CACHE_TTL_SECONDS: 604800,
} as const;

// ============================================================================
// LAYOUT DEFAULT POSITIONS
// ============================================================================

/**
 * Default overlay layout positions on a 1920x1080 canvas.
 */
export const LAYOUT_DEFAULTS = {
  /**
   * Default lower third position.
   * Bottom-left corner with padding, at full scale.
   * @see lib/services/DatabaseService.ts
   */
  LOWER_THIRD: { x: 60, y: 920, scale: 1 } as const,

  /**
   * Default countdown position.
   * Centered on canvas at full scale.
   * @see lib/services/DatabaseService.ts
   */
  COUNTDOWN: { x: 960, y: 540, scale: 1 } as const,

  /**
   * Default poster position.
   * Centered on canvas at full scale.
   * @see lib/services/DatabaseService.ts
   */
  POSTER: { x: 960, y: 540, scale: 1 } as const,
} as const;

// ============================================================================
// ANIMATION TIMING DEFAULTS
// ============================================================================

/**
 * Default animation timing for lower third overlay.
 * All durations are in milliseconds.
 */
export const LOWER_THIRD_ANIMATION = {
  TIMING: {
    /** Logo fade-in duration */
    LOGO_FADE_DURATION: 200,
    /** Logo scale animation duration */
    LOGO_SCALE_DURATION: 200,
    /** 3D flip animation duration */
    FLIP_DURATION: 600,
    /** Delay before flip animation starts */
    FLIP_DELAY: 500,
    /** Delay before bar appears */
    BAR_APPEAR_DELAY: 800,
    /** Bar expansion animation duration */
    BAR_EXPAND_DURATION: 450,
    /** Delay before text appears */
    TEXT_APPEAR_DELAY: 1000,
    /** Text fade-in duration */
    TEXT_FADE_DURATION: 250,
  },
  STYLES: {
    /** Bar corner radius in pixels */
    BAR_BORDER_RADIUS: 16,
    /** Minimum bar width in pixels */
    BAR_MIN_WIDTH: 200,
    /** Avatar border width in pixels */
    AVATAR_BORDER_WIDTH: 4,
    /** Avatar border color */
    AVATAR_BORDER_COLOR: '#272727',
    /** Max width percentages for free text by alignment */
    FREE_TEXT_MAX_WIDTH: {
      left: 65,
      right: 65,
      center: 90,
    },
  },
} as const;

// ============================================================================
// RECONNECTION CONSTANTS
// ============================================================================

/**
 * WebSocket and connection reconnection constants.
 */
export const RECONNECTION = {
  /**
   * Base delay in milliseconds before first reconnection attempt.
   * Used for OBS and Streamer.bot connections.
   * @see lib/adapters/obs/OBSConnectionManager.ts
   * @see lib/adapters/streamerbot/StreamerbotGateway.ts
   */
  BASE_DELAY_MS: 3000,

  /**
   * Maximum number of reconnection attempts before giving up.
   * @see lib/adapters/obs/OBSConnectionManager.ts
   * @see lib/adapters/streamerbot/StreamerbotGateway.ts
   */
  MAX_ATTEMPTS: 10,

  /**
   * Polling interval in milliseconds for waiting on initialization.
   * @see lib/services/ServiceEnsurer.ts
   */
  POLL_INTERVAL_MS: 100,
} as const;

// ============================================================================
// WIKIPEDIA CONSTANTS
// ============================================================================

/**
 * Wikipedia service configuration constants.
 */
export const WIKIPEDIA = {
  /**
   * Maximum number of sections to fetch from Wikipedia articles.
   * Includes intro + first N-1 sections.
   * @see lib/services/WikipediaResolverService.ts
   */
  MAX_SECTIONS: 3,

  /**
   * Maximum character limit for truncating Wikipedia content.
   * Approximately 10k tokens for LLM processing.
   * @see lib/services/WikipediaResolverService.ts
   */
  TOKEN_CHAR_LIMIT: 25000,

  /**
   * HTTP request timeout in milliseconds for Wikipedia API.
   * @see lib/services/WikipediaResolverService.ts
   */
  API_TIMEOUT_MS: 5000,

  /**
   * Maximum number of entries in the in-memory LRU cache.
   * @see lib/services/WikipediaCacheService.ts
   */
  MAX_MEMORY_ENTRIES: 100,

  /**
   * Cache cleanup interval in milliseconds (6 hours).
   * @see lib/services/WikipediaCacheService.ts
   */
  CLEANUP_INTERVAL_MS: 6 * 60 * 60 * 1000,
} as const;

// ============================================================================
// LLM PROVIDER CONSTANTS
// ============================================================================

/**
 * LLM provider configuration constants.
 */
export const LLM = {
  /**
   * Default timeout in milliseconds for LLM API requests.
   * @see lib/services/llm/OllamaProvider.ts
   * @see lib/services/llm/OpenAIProvider.ts
   * @see lib/services/llm/AnthropicProvider.ts
   */
  DEFAULT_TIMEOUT_MS: 60000,

  /**
   * Default temperature for LLM generation.
   * Lower values = more deterministic output.
   * @see lib/services/llm/*.ts
   */
  DEFAULT_TEMPERATURE: 0.3,

  /**
   * Max tokens for summarization responses.
   * @see lib/services/llm/AnthropicProvider.ts
   */
  SUMMARIZATION_MAX_TOKENS: 500,

  /**
   * Max tokens for OpenAI reasoning models.
   * @see lib/services/llm/OpenAIProvider.ts
   */
  OPENAI_MAX_COMPLETION_TOKENS: 2000,

  /**
   * Context window size for Ollama.
   * @see lib/services/llm/OllamaProvider.ts
   */
  OLLAMA_CONTEXT_SIZE: 2048,

  /**
   * Timeout for connection test requests.
   * @see lib/services/llm/AnthropicProvider.ts
   * @see lib/services/llm/OllamaProvider.ts
   */
  CONNECTION_TEST_TIMEOUT_MS: 5000,

  /**
   * Max tokens for minimal test requests.
   * @see lib/services/llm/AnthropicProvider.ts
   */
  TEST_MAX_TOKENS: 10,
} as const;

// ============================================================================
// RATE LIMITING CONSTANTS
// ============================================================================

/**
 * Rate limiting and cleanup constants.
 */
export const RATE_LIMITING = {
  /**
   * Cleanup interval in milliseconds for expired rate limit buckets (10 minutes).
   * @see lib/services/RateLimiterService.ts
   */
  BUCKET_CLEANUP_INTERVAL_MS: 10 * 60 * 1000,

  /**
   * Bucket expiry time in milliseconds (1 hour).
   * Buckets older than this are cleaned up.
   * @see lib/services/RateLimiterService.ts
   */
  BUCKET_EXPIRY_MS: 60 * 60 * 1000,

  /**
   * Rate limiting window in milliseconds for RPS calculations.
   * @see lib/services/QuizViewerInputService.ts
   */
  WINDOW_MS: 1000,
} as const;

// ============================================================================
// GITHUB RELEASE CHECKER CONSTANTS
// ============================================================================

/**
 * GitHub release checker configuration.
 */
export const GITHUB = {
  /**
   * Cache duration in milliseconds for GitHub release checks (1 hour).
   * @see lib/services/updater/GitHubReleaseChecker.ts
   */
  RELEASE_CACHE_DURATION_MS: 3600000,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Layout position with x, y coordinates and scale factor */
export type LayoutPosition = {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
};

// ============================================================================
// HELPER FUNCTIONS FOR SQL DEFAULTS
// ============================================================================

/**
 * Get JSON string for layout defaults (for SQL DEFAULT clauses).
 * SQL requires quoted JSON strings, so these return stringified versions.
 */
export const LAYOUT_DEFAULTS_JSON = {
  LOWER_THIRD: JSON.stringify(LAYOUT_DEFAULTS.LOWER_THIRD),
  COUNTDOWN: JSON.stringify(LAYOUT_DEFAULTS.COUNTDOWN),
  POSTER: JSON.stringify(LAYOUT_DEFAULTS.POSTER),
} as const;
