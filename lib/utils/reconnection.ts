/**
 * Reconnection Utility - Exponential Backoff
 *
 * Provides shared reconnection logic with exponential backoff
 * for gateway connections (OBS, Streamerbot, WebSocket clients).
 *
 * Used by:
 * - lib/adapters/streamerbot/StreamerbotGateway.ts
 * - lib/adapters/obs/OBSConnectionManager.ts
 * - components/presenter/hooks/useStreamerbotClient.ts
 */

/**
 * Configuration for reconnection behavior
 */
export interface ReconnectionConfig {
  /** Initial delay in milliseconds before first retry */
  initialDelay: number;
  /** Maximum delay between retries */
  maxDelay: number;
  /** Maximum number of retry attempts (0 = unlimited) */
  maxAttempts: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
}

/**
 * State for tracking reconnection attempts
 */
export interface ReconnectionState {
  attempts: number;
  timer: ReturnType<typeof setTimeout> | undefined;
}

/**
 * Default reconnection configuration
 */
export const DEFAULT_RECONNECT_CONFIG: ReconnectionConfig = {
  initialDelay: 1000,
  maxDelay: 30000,
  maxAttempts: 10,
  backoffMultiplier: 2,
};

/**
 * Calculate the delay for the next reconnection attempt
 *
 * @param config Reconnection configuration
 * @param attempt Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateReconnectDelay(
  config: ReconnectionConfig,
  attempt: number
): number {
  const multiplier = config.backoffMultiplier ?? 2;
  const delay = config.initialDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Check if more reconnection attempts are allowed
 *
 * @param config Reconnection configuration
 * @param attempt Current attempt number
 * @returns true if more attempts are allowed
 */
export function canReconnect(
  config: ReconnectionConfig,
  attempt: number
): boolean {
  if (config.maxAttempts === 0) return true; // Unlimited
  return attempt < config.maxAttempts;
}

/**
 * Schedule a reconnection attempt
 *
 * @param config Reconnection configuration
 * @param state Current reconnection state (will be mutated)
 * @param callback Function to call on reconnect
 * @param logger Optional logger for debug output
 * @returns true if reconnection was scheduled, false if max attempts reached
 */
export function scheduleReconnect(
  config: ReconnectionConfig,
  state: ReconnectionState,
  callback: () => void | Promise<void>,
  logger?: { info: (msg: string) => void }
): boolean {
  // Clear any existing timer
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = undefined;
  }

  // Check if we can reconnect
  if (!canReconnect(config, state.attempts)) {
    logger?.info(`Max reconnection attempts (${config.maxAttempts}) reached`);
    return false;
  }

  // Calculate delay
  const delay = calculateReconnectDelay(config, state.attempts);
  state.attempts++;

  logger?.info(
    `Scheduling reconnect in ${delay}ms (attempt ${state.attempts}/${config.maxAttempts || "∞"})`
  );

  // Schedule reconnection
  state.timer = setTimeout(async () => {
    state.timer = undefined;
    try {
      await callback();
    } catch (error) {
      // Error handling is up to the callback
    }
  }, delay);

  return true;
}

/**
 * Reset reconnection state (call on successful connection)
 *
 * @param state Reconnection state to reset
 */
export function resetReconnectionState(state: ReconnectionState): void {
  state.attempts = 0;
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = undefined;
  }
}

/**
 * Create initial reconnection state
 */
export function createReconnectionState(): ReconnectionState {
  return {
    attempts: 0,
    timer: undefined,
  };
}

/**
 * Cancel any pending reconnection
 *
 * @param state Reconnection state
 */
export function cancelReconnect(state: ReconnectionState): void {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = undefined;
  }
}
