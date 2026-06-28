/**
 * Unit tests for TwitchOAuthManager — dual-process OAuth robustness.
 *
 * These encode the three fixes for the "admin says connected, dashboard says
 * not connected" bug caused by two independent OAuthManager singletons (Next.js
 * + Express backend) sharing one SQLite DB:
 *
 *  1. Sole refresh owner   — only the process flagged as owner (the backend)
 *                            schedules the background token-refresh timer, so the
 *                            two processes can't race on the single-use refresh
 *                            token.
 *  2. Non-destructive fail — a failed refresh must NOT wipe the shared DB tokens
 *                            (which would log both processes out).
 *  3. Self-heal recovery   — reloadFromDatabase() must restore "authorized" from
 *                            ANY prior state (incl. "error"), so a stuck process
 *                            recovers from valid tokens already in the DB.
 */

// --- Mocks -----------------------------------------------------------------

jest.mock("@/lib/utils/Logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockBroadcast = jest.fn();
jest.mock("@/lib/services/WebSocketHub", () => ({
  WebSocketHub: { getInstance: jest.fn(() => ({ broadcast: mockBroadcast })) },
}));

const mockCheckpoint = jest.fn();
jest.mock("@/lib/services/DatabaseService", () => ({
  DatabaseService: { getInstance: jest.fn(() => ({ checkpoint: mockCheckpoint })) },
}));

// Mutable fake DB state, controlled per test.
const mockTwitchState: {
  tokens: Record<string, unknown> | null;
  clientId: string | undefined;
  clientSecret: string | undefined;
} = { tokens: null, clientId: "test-client-id", clientSecret: "test-secret" };

const mockSaveTokens = jest.fn((tokens: Record<string, unknown> | null) => {
  mockTwitchState.tokens = tokens;
});

jest.mock("@/lib/services/SettingsService", () => ({
  SettingsService: {
    getInstance: jest.fn(() => ({
      getTwitchOAuthTokens: jest.fn(() => mockTwitchState.tokens),
      saveTwitchOAuthTokens: mockSaveTokens,
      getTwitchSettings: jest.fn(() => ({ clientId: mockTwitchState.clientId, enabled: true, pollIntervalMs: 30000 })),
      getTwitchClientSecret: jest.fn(() => mockTwitchState.clientSecret),
      saveTwitchOAuthState: jest.fn(),
    })),
  },
}));

import { TwitchOAuthManager } from "@/lib/services/twitch/TwitchOAuthManager";

// --- Helpers ---------------------------------------------------------------

const REFRESH_OWNER_ENV = "TWITCH_REFRESH_OWNER";

function validTokens(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: "access-abc",
    refreshToken: "refresh-xyz",
    expiresAt: Date.now() + 60 * 60 * 1000, // +1h, not near expiry
    scope: ["chat:read"],
    user: { id: "1310603235", login: "la_scene_avolo", displayName: "la_scene_avolo" },
    ...overrides,
  };
}

/** Reset the singleton and construct a fresh manager with current mock state. */
async function freshManager(): Promise<TwitchOAuthManager> {
  (TwitchOAuthManager as unknown as { instance?: TwitchOAuthManager }).instance = undefined;
  const manager = TwitchOAuthManager.getInstance();
  await manager.ensureInitialized();
  return manager;
}

describe("TwitchOAuthManager — dual-process robustness", () => {
  let manager: TwitchOAuthManager | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTwitchState.tokens = null;
    mockTwitchState.clientId = "test-client-id";
    mockTwitchState.clientSecret = "test-secret";
    delete process.env[REFRESH_OWNER_ENV];
  });

  afterEach(() => {
    // Clean up any real interval created by startRefreshTimer.
    if (manager) {
      (manager as unknown as { stopRefreshTimer: () => void }).stopRefreshTimer();
      manager = null;
    }
    delete process.env[REFRESH_OWNER_ENV];
  });

  describe("Fix 1 — sole refresh owner", () => {
    it("does NOT schedule a refresh timer when not the owner (e.g. Next.js process)", async () => {
      mockTwitchState.tokens = validTokens();
      manager = await freshManager();

      // Tokens are valid → it should still report authenticated...
      expect(manager.isAuthenticated()).toBe(true);
      // ...but as a non-owner it must NOT run the background refresh timer.
      expect(manager.hasActiveRefreshTimer()).toBe(false);
    });

    it("schedules a refresh timer when flagged as the owner (the backend)", async () => {
      process.env[REFRESH_OWNER_ENV] = "1";
      mockTwitchState.tokens = validTokens();
      manager = await freshManager();

      expect(manager.isAuthenticated()).toBe(true);
      expect(manager.hasActiveRefreshTimer()).toBe(true);
    });
  });

  describe("Fix 2 — refresh failure token handling", () => {
    it("keeps the stored tokens on a TRANSIENT failure (network/5xx)", async () => {
      process.env[REFRESH_OWNER_ENV] = "1";
      mockTwitchState.tokens = validTokens();
      manager = await freshManager();

      // A network-level rejection is transient — tokens must be preserved so the
      // next retry can succeed (and so we never log out the other process).
      global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

      await manager.refreshToken();

      expect(mockSaveTokens).not.toHaveBeenCalledWith(null);
      expect(mockTwitchState.tokens).not.toBeNull();
    });

    it("clears the stored tokens on a PERMANENT failure (400/401 invalid refresh token)", async () => {
      process.env[REFRESH_OWNER_ENV] = "1";
      mockTwitchState.tokens = validTokens();
      manager = await freshManager();

      // 400 invalid_grant means the refresh token is dead — only re-OAuth fixes it.
      // Clearing stops the auth-watch from retrying a dead token forever.
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "invalid_grant",
      }) as unknown as typeof fetch;

      await manager.refreshToken();

      expect(mockSaveTokens).toHaveBeenCalledWith(null);
      expect(mockTwitchState.tokens).toBeNull();
    });
  });

  describe("Fix 3 — self-heal recovery from a stuck 'error' state", () => {
    it("restores 'authorized' on reloadFromDatabase when valid tokens exist in the DB", async () => {
      mockTwitchState.tokens = validTokens();
      manager = await freshManager();
      expect(manager.isAuthenticated()).toBe(true);

      // Simulate the process having fallen into the terminal "error" state
      // (e.g. a transient init/refresh failure). The DB still has valid tokens.
      (manager as unknown as { status: Record<string, unknown> }).status = {
        state: "error",
        user: null,
        expiresAt: null,
        scopes: null,
        error: { type: "api_error", message: "boom", timestamp: 1, recoverable: true },
      };
      expect(manager.isAuthenticated()).toBe(false);

      await manager.reloadFromDatabase();

      // Must recover — error → authorized is otherwise blocked by the state machine.
      expect(manager.getStatus().state).toBe("authorized");
      expect(manager.isAuthenticated()).toBe(true);
    });
  });
});
