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
// TWITCH INTEGRATION CONSTANTS
// ============================================================================

/**
 * Twitch integration polling and timing constants.
 */
export const TWITCH = {
  /**
   * Base URL for Twitch Helix API.
   * @see lib/services/twitch/TwitchAPIClient.ts
   */
  API_BASE: "https://api.twitch.tv/helix",

  /**
   * Default polling interval in milliseconds for stream stats (30 seconds).
   * Twitch updates viewer counts approximately every 30 seconds.
   * @see lib/services/TwitchService.ts
   */
  POLL_INTERVAL_MS: 30000,

  /**
   * Minimum polling interval allowed (10 seconds).
   * Prevents excessive API calls.
   * @see lib/services/TwitchService.ts
   */
  MIN_POLL_INTERVAL_MS: 10000,

  /**
   * Maximum polling interval allowed (5 minutes).
   * @see lib/services/TwitchService.ts
   */
  MAX_POLL_INTERVAL_MS: 300000,

  /**
   * Timeout for Twitch API requests in milliseconds.
   * @see lib/services/TwitchService.ts
   */
  API_TIMEOUT_MS: 10000,

  /**
   * Buffer time before token expiry to trigger refresh (5 minutes).
   * @see lib/services/TwitchService.ts
   */
  TOKEN_REFRESH_BUFFER_MS: 300000,

  /**
   * Interval for the backend "auth watch" self-heal loop (30 seconds).
   * While unauthenticated, the backend periodically reloads OAuth tokens from
   * the DB so it recovers tokens written by another process (e.g. the Next.js
   * OAuth callback) without needing a restart.
   * @see lib/services/TwitchService.ts
   */
  AUTH_WATCH_INTERVAL_MS: 30000,
} as const;

/**
 * Env var name flagging the single process that owns the Twitch token-refresh
 * timer. Set to "1" in the Express backend only. Twitch rotates (single-use)
 * refresh tokens, so two processes refreshing the same token would race and
 * invalidate each other — only the owner runs the background refresh.
 * @see lib/services/twitch/TwitchOAuthManager.ts · server/backend.ts
 */
export const TWITCH_REFRESH_OWNER_ENV = "TWITCH_REFRESH_OWNER";

// ============================================================================
// MEDIA PLAYER CONSTANTS
// ============================================================================

/**
 * Media player driver system constants.
 */
export const MEDIA_PLAYER = {
  /**
   * Timeout in milliseconds for commands sent to Chrome extension drivers.
   * If a driver doesn't respond within this time, the command is considered failed.
   * @see lib/services/MediaPlayerManager.ts
   */
  COMMAND_TIMEOUT_MS: 5000,

  /**
   * Duration of the fadeout effect in milliseconds.
   * @see chrome-extension/drivers/artlist.js
   * @see chrome-extension/drivers/youtube.js
   */
  FADEOUT_DURATION_MS: 5000,

  /**
   * Number of steps in the fadeout animation (higher = smoother).
   * @see chrome-extension/drivers/driver-base.js
   */
  FADEOUT_STEPS: 60,

  /**
   * Interval in milliseconds between status polls from content scripts.
   * @see chrome-extension/drivers/driver-base.js
   */
  STATUS_POLL_INTERVAL_MS: 2000,
} as const;

// ============================================================================
// UI CONSTANTS
// ============================================================================

/**
 * UI timing constants for toasts, animations, and transitions.
 */
export const UI = {
  /**
   * Standard toast notification duration in milliseconds.
   */
  TOAST_DURATION_MS: 2000,

  /**
   * Short toast duration for quick confirmations.
   */
  TOAST_SHORT_MS: 1500,

  /**
   * Long toast duration for important messages.
   */
  TOAST_LONG_MS: 3000,

  /**
   * Error toast duration - longer for reading error messages.
   */
  TOAST_ERROR_MS: 5000,
} as const;

// ============================================================================
// QUERY STALE TIME CONSTANTS
// ============================================================================

/**
 * React Query stale time constants for cache invalidation.
 */
export const QUERY_STALE_TIMES = {
  /**
   * Fast refresh for frequently changing data (5 seconds).
   * @example Connection status, live metrics
   */
  FAST: 5 * 1000,

  /**
   * Normal refresh for moderately changing data (30 seconds).
   * @example Guest list, poster list
   */
  NORMAL: 30 * 1000,

  /**
   * Slow refresh for rarely changing data (1 minute).
   * @example Themes, profiles, settings
   */
  SLOW: 60 * 1000,

  /**
   * Very slow refresh for configuration data (5 minutes).
   * @example Plugin list, system info
   */
  VERY_SLOW: 5 * 60 * 1000,
} as const;

// ============================================================================
// HEALTH CHECK CONSTANTS
// ============================================================================

/**
 * Health check and polling constants.
 */
export const HEALTH_CHECK = {
  /**
   * Interval for polling connection health (5 seconds).
   */
  POLL_INTERVAL_MS: 5000,

  /**
   * Timeout for health check requests.
   */
  TIMEOUT_MS: 3000,
} as const;

// ============================================================================
// LLM URL CONSTANTS
// ============================================================================

/**
 * LLM provider URL constants.
 */
export const LLM_URLS = {
  /**
   * Default Ollama local server URL.
   */
  OLLAMA_DEFAULT: "http://localhost:11434",

  /**
   * Anthropic API base URL.
   */
  ANTHROPIC_API: "https://api.anthropic.com/v1",

  /**
   * OpenAI API base URL.
   */
  OPENAI_API: "https://api.openai.com/v1",
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * Validation constants for field limits and ranges.
 */
export const VALIDATION = {
  /**
   * Field length limits for text inputs.
   */
  FIELD_LIMITS: {
    /** Short names (display names, titles) */
    NAME_SHORT: 100,
    /** Medium names (descriptions) */
    NAME_MEDIUM: 200,
    /** Long text (notes, bodies) */
    TEXT_LONG: 500,
    /** Extra long text (full content) */
    TEXT_EXTRA_LONG: 2000,
  },

  /**
   * Numeric ranges for validation.
   */
  RANGES: {
    /** Minimum port number */
    PORT_MIN: 1,
    /** Maximum port number */
    PORT_MAX: 65535,
    /** Minimum scale factor */
    SCALE_MIN: 0.5,
    /** Maximum scale factor */
    SCALE_MAX: 2,
    /** Minimum duration in seconds */
    DURATION_MIN: 1,
    /** Maximum countdown duration in seconds (1 hour) */
    COUNTDOWN_MAX: 3600,
  },
} as const;

// ============================================================================
// DASHBOARD EVENT CONSTANTS
// ============================================================================

/**
 * Custom event names dispatched on `window` for inter-panel communication.
 */
export const DASHBOARD_EVENTS = {
  /** Dispatched by TextPresetsPanel to load a preset into LowerThirdPanel */
  LOAD_TEXT_PRESET: "load-text-preset",
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
// AI CHAT CONSTANTS
// ============================================================================

/**
 * AI Chat assistant configuration constants.
 */
export const AI_CHAT = {
  /** Maximum tool-call steps per request */
  MAX_STEPS: 5,

  /** MCP server URL for tool discovery (use 127.0.0.1 to avoid IPv6 resolution) */
  MCP_URL: `http://127.0.0.1:${process.env.MCP_PORT || "3004"}/mcp`,

  /** Cache TTL for discovered MCP tools (1 minute) */
  TOOL_CACHE_TTL_MS: 60000,

  /** Tools that require user confirmation before execution */
  DESTRUCTIVE_TOOLS: [
    "delete-guest",
    "delete-poster",
    "clear-all-overlays",
  ],
} as const;

// ============================================================================
// LIVE ASSIST CONSTANTS
// ============================================================================

/** Real-time listening assistant configuration. */
export const LIVE_ASSIST = {
  /** WebSocket channel for suggestions + STT status. */
  CHANNEL: "live-assist",
  /** Transcript buffer retention (ms). */
  BUFFER_RETENTION_MS: 120_000,
  /** No segment received for this long ⇒ STT considered disconnected (ms). */
  STT_STALE_MS: 10_000,
  /** Default context window before/after a keyword hit (seconds). */
  WINDOW_BEFORE_SEC: 15,
  WINDOW_AFTER_SEC: 15,
  /** Minimum extractor confidence to surface a suggestion. */
  CONFIDENCE_THRESHOLD: 0.6,
  /** Dedup window: same (intent, entity) ignored within this span (ms). */
  DEDUP_WINDOW_MS: 600_000,
  /** Cap on stored suggestions (server + client) to bound memory over a long show. */
  MAX_STORED_SUGGESTIONS: 200,
  /** Max wall-clock wait before firing a window even if no +15s audio arrived (ms). */
  WINDOW_MAX_WAIT_MS: 20_000,
  /** Default faster-whisper model. */
  DEFAULT_WHISPER_MODEL: "large-v3",
  /** Default keyword list per provider id.
   *  `poster` (Wikipedia) handles théâtre/concerts; `poster-tmdb` (TMDB) handles
   *  films/séries. `affiche` is intentionally listed under BOTH so both become
   *  candidates and the LLM disambiguates film-vs-théâtre via the context prompts. */
  DEFAULT_KEYWORDS: {
    poster: ["spectacle", "pièce", "affiche", "concert"],
    "poster-tmdb": ["film", "série", "affiche"],
    definition: ["définition", "c'est quoi", "qu'est-ce que", "ça veut dire"],
  } as Record<string, string[]>,
  /** The pre-split `poster` default, used only to detect & migrate untouched configs. */
  LEGACY_POSTER_KEYWORDS: ["spectacle", "affiche", "pièce", "film", "concert"],
  /** Default per-provider extraction guidance injected into the IntentExtractor prompt.
   *  Each provider's prompt shapes how the entity is formed for ITS source. */
  DEFAULT_CONTEXT_PROMPTS: {
    poster:
      "entité = titre exact du spectacle / pièce / concert (sans article) ; ajoute le type entre parenthèses pour viser le bon article Wikipédia : « Roméo et Juliette (pièce de théâtre) », « Les Vieilles Canailles (concert) ».",
    "poster-tmdb":
      "entité = titre du film / série. S'il est nommé, reprends-le tel quel (sans année ni article). S'il n'est PAS nommé mais identifiable d'après les indices (acteur, intrigue, réplique, époque), PROPOSE le titre le plus emblématique qui correspond — p. ex. « le film avec Sharon Stone » → « Basic Instinct », « le film de requins de Spielberg » → « Les Dents de la mer », « la série des Stranger » → « Stranger Things » — avec infere=true et une confiance reflétant ta certitude. Ne reste non actionnable QUE si vraiment aucun titre plausible ne ressort. Base TMDB (cinéma/séries), sans parenthèses.",
    definition: "entité = le concept / sujet exact à définir, sans article.",
  } as Record<string, string>,
  /** Stricter confidence bar for a DEDUCED (inferred) entity, to limit false guesses
   *  while still admitting a confident iconic match (a human validates anyway). */
  INFERRED_CONFIDENCE_THRESHOLD: 0.7,
  /** LocalPosters fast-path: match spoken words against existing poster titles (no LLM). */
  LOCAL_POSTER_MIN_SIMILARITY: 0.8,
  /** Only title tokens at least this long can trigger (drops noise words). */
  LOCAL_POSTER_MIN_TOKEN_LEN: 4,
  /** French stop-word set excluded from poster title triggers.
   *  Source: spaCy French stopwords (https://github.com/explosion/spaCy), filtered
   *  to ≥4 chars after norm() (lowercase + NFD accent-strip + apostrophe-fold),
   *  hyphenated compounds excluded (they split into sub-tokens already filtered by
   *  LOCAL_POSTER_MIN_TOKEN_LEN). "bien" added manually (absent from spaCy). */
  LOCAL_POSTER_STOPWORDS_FR: [
    "afin", "ainsi", "alors", "apres", "assez", "attendu", "aupres", "auquel",
    "aura", "auraient", "aurait", "auront", "aussi", "autre", "autrement", "autres",
    "autrui", "auxquelles", "auxquels", "avaient", "avais", "avait", "avant", "avec",
    "avoir", "avons", "ayant", "basee", "bien", "ceci", "cela", "celle", "celles",
    "celui", "cent", "cependant", "certain", "certaine", "certaines", "certains",
    "certes", "cette", "ceux", "chacun", "chacune", "chaque", "chez", "cinq",
    "cinquantaine", "cinquante", "cinquantieme", "cinquieme", "combien", "comme",
    "comment", "compris", "concernant", "dans", "debout", "dedans", "dehors", "deja",
    "dela", "depuis", "derriere", "desormais", "desquelles", "desquels", "dessous",
    "dessus", "deux", "deuxieme", "devant", "devers", "devra", "different",
    "differente", "differentes", "differents", "dire", "directe", "directement",
    "dite", "dits", "divers", "diverse", "diverses", "dixieme", "doit", "doivent",
    "donc", "dont", "douze", "douzieme", "duquel", "durant", "effet", "egalement",
    "elle", "elles", "encore", "enfin", "entre", "envers", "environ", "etaient",
    "etais", "etait", "etant", "etre", "exactement", "excepte", "facon", "fais",
    "faisaient", "faisant", "fait", "feront", "font", "gens", "hormis", "hors",
    "huit", "huitieme", "importe", "jusqu", "jusque", "juste", "laisser", "laquelle",
    "lequel", "lesquelles", "lesquels", "leur", "leurs", "longtemps", "lors",
    "lorsque", "maint", "maintenant", "mais", "malgre", "meme", "memes", "merci",
    "mien", "mienne", "miennes", "miens", "mille", "moindres", "moins", "neanmoins",
    "neuvieme", "nombreuses", "nombreux", "notamment", "notre", "notres", "nous",
    "nouveau", "onze", "onzieme", "outre", "ouvert", "ouverte", "ouverts", "parce",
    "parfois", "parle", "parlent", "parler", "parmi", "partant", "pendant", "pense",
    "permet", "personne", "peut", "peuvent", "peux", "plus", "plusieurs", "plutot",
    "possible", "possibles", "pour", "pourquoi", "pourrais", "pourrait", "pouvait",
    "prealable", "precisement", "premier", "premiere", "premierement", "pres",
    "procedant", "proche", "puis", "puisque", "quand", "quant", "quarante",
    "quatorze", "quatre", "quatrieme", "quel", "quelconque", "quelle", "quelles",
    "quelque", "quelques", "quelquun", "quels", "quiconque", "quinze", "quoi",
    "quoique", "relative", "relativement", "rend", "rendre", "restant", "reste",
    "restent", "retour", "revoici", "revoila", "sait", "sans", "sauf", "seize",
    "selon", "semblable", "semblaient", "semble", "semblent", "sent", "sept",
    "septieme", "sera", "seraient", "serait", "seront", "seul", "seule", "seulement",
    "seules", "seuls", "sien", "sienne", "siennes", "siens", "sinon", "sixieme",
    "soit", "soixante", "sont", "sous", "souvent", "specifique", "specifiques",
    "stop", "suffisant", "suffisante", "suffit", "suis", "suit", "suivant",
    "suivante", "suivantes", "suivants", "suivre", "surtout", "tant", "telle",
    "tellement", "telles", "tels", "tenant", "tend", "tenir", "tente", "tien",
    "tienne", "tiennes", "tiens", "touchant", "toujours", "tous", "tout", "toute",
    "toutes", "treize", "trente", "tres", "trois", "troisieme", "unes", "vais",
    "vers", "vingt", "voici", "voila", "vont", "votre", "votres", "vous",
  ] as string[],
  /** Whisper "silence hallucination" filter. faster-whisper was trained on
   *  YouTube/TV subtitles, so during silence/non-speech it emits subtitle credits
   *  and boilerplate ("Sous-titrage Société Radio-Canada", "Merci d'avoir regardé
   *  cette vidéo", …). These segments are dropped at ingest. Matched on the
   *  normalized form (lowercase, accent-stripped, apostrophe-folded — same `norm()`
   *  as keywords), ignoring surrounding punctuation/quotes. Store readable text
   *  here (accents/apostrophes OK); normalization happens at match time. */
  HALLUCINATION_PHRASES: [
    // Matched whole-segment (exact, after normalization + punctuation strip), so a
    // CTA like "Abonnez-vous" only drops a segment that IS exactly that — real speech
    // ("abonnez-vous à la newsletter") is kept. Brand/credit families are handled by
    // HALLUCINATION_PATTERNS below instead, to catch their many variants.
    // FR
    "Abonnez-vous",
    "N'oubliez pas de vous abonner",
    "[Musique]",
    "[Applaudissements]",
    "(Rires)",
    "[Rires]",
    // EN
    "Thanks for watching",
    "Thank you for watching",
    "Please subscribe",
    "[Music]",
    "[Applause]",
  ] as string[],
  /** Regex families (run on the normalized — lowercased, accent-stripped,
   *  apostrophe-folded — text). Brand/credit tokens never occur in genuine studio
   *  speech, so these are matched anywhere; the `^…` ones assume the hallucination
   *  is the whole segment. Sources: openai/whisper discussions #928/#1873, the
   *  HF `whisper-hallucinations` dataset, whisper.cpp #2660. */
  HALLUCINATION_PATTERNS: [
    // "Sous-titrage ST' 501", "… Société Radio-Canada", "… FR 2021",
    // "Sous-titres réalisés par la communauté d'Amara.org" (incl. the malformed "para" variant)
    /^sous-?titr(age|es)\b/,
    // Amara.org credit in any language wrapper (FR/EN/DE/ES/IT/PT/ZH…)
    /amara\s*\.?\s*org/,
    // SousTitreur.com credit ("❤️ par SousTitreur.com")
    /soustitreur\s*\.?\s*com/,
    // Cross-language TV/credit line ending in a year ("copyright wdr 2021", "… zdf … 2017")
    /\b(copyright|untertitel|legendas?|sottotitoli|subtitulos)\b.*\b(19|20)\d{2}\b/,
    // Transcription-service credits (Otter / CastingWords)
    /\b(transcri(bed|ption|pt)|transcrit)\b.*\b(otter\s*\.?\s*ai|castingwords)\b/,
    // FR sign-off family ("merci d'avoir regardé [cette|la] vidéo", "… regardé !")
    /^merci d'avoir regard/,
    // FR sign-off ("j'espère que vous avez apprécié [cette|la] vidéo")
    /^j'espere que vous avez apprecie/,
  ] as RegExp[],
} as const;

// ============================================================================
// TMDB (The Movie Database) — poster source for films / séries
// ============================================================================

/** TMDB v3 API config. The API key is read at runtime from the `tmdb_api_key` setting. */
export const TMDB = {
  /** REST API base (v3). */
  API_BASE: "https://api.themoviedb.org/3",
  /** Image CDN base; combine with a size + poster_path. */
  IMAGE_BASE: "https://image.tmdb.org/t/p",
  /** Poster size segment (w780 ≈ good balance of quality vs weight for a local asset). */
  POSTER_SIZE: "w780",
  /** Preferred result language (falls back to original metadata when missing). */
  LANGUAGE: "fr-FR",
  /** In-memory resolver cache TTL (ms). */
  CACHE_TTL_MS: 6 * 60 * 60 * 1000,
  /** Abort a TMDB request after this many ms (search + connection test). */
  REQUEST_TIMEOUT_MS: 8000,
  /** Setting key holding the API key (mirrors `openai_api_key`). */
  API_KEY_SETTING: "tmdb_api_key",
} as const;

// ============================================================================
// WORD HARVEST CONSTANTS
// ============================================================================

/**
 * Word Harvest game configuration constants.
 */
export const WORD_HARVEST = {
  /** Default number of words to collect */
  DEFAULT_TARGET_COUNT: 10,

  /** Minimum allowed target count */
  MIN_TARGET_COUNT: 3,

  /** Maximum allowed target count */
  MAX_TARGET_COUNT: 50,

  /** Minimum word length (characters) */
  MIN_WORD_LENGTH: 2,

  /** Maximum word length (characters) */
  MAX_WORD_LENGTH: 30,

  /** Regex to extract words from chat messages: #word or !mot word */
  WORD_COMMAND_REGEX: /^(?:#(\S+)|!mot\s+(\S+))$/i,

  /** Sound: word approved pop */
  SOUND_WORD_APPROVED: "/sounds/word-harvest-approved.wav",

  /** Sound: celebration jingle (target reached) */
  SOUND_CELEBRATION: "/sounds/word-harvest-complete.wav",

  /** Sound: word struck through (used in improv) */
  SOUND_WORD_USED: "/sounds/word-harvest-used.wav",

  /** Sound: impro starts */
  SOUND_IMPRO_START: "/sounds/word-harvest-impro-start.wav",

  /** Google Fonts URL for Permanent Marker */
  FONT_URL: "https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap",
} as const;

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
