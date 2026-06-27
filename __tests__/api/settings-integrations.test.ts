/* eslint-disable @typescript-eslint/no-explicit-any */

// In-memory settings store backing the mocked SettingsRepository
const store = new Map<string, string>();
const getSetting = jest.fn((key: string) => store.get(key) ?? null);
const setSetting = jest.fn((key: string, value: string) => {
  store.set(key, value);
});

jest.mock("@/lib/repositories/SettingsRepository", () => ({
  SettingsRepository: {
    getInstance: jest.fn(() => ({ getSetting, setSetting })),
  },
}));

jest.mock("@/lib/services/OllamaSummarizerService", () => ({
  OllamaSummarizerService: {
    getInstance: jest.fn(() => ({ reloadConfig: jest.fn() })),
  },
}));

import { GET, POST } from "@/app/api/settings/integrations/route";

function makePost(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/settings/integrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
});

describe("GET /api/settings/integrations", () => {
  it("includes tmdb_api_key in the returned settings", async () => {
    store.set("tmdb_api_key", "tmdb-secret-123");

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.settings.tmdb_api_key).toBe("tmdb-secret-123");
  });

  it("defaults tmdb_api_key to an empty string when unset", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.settings.tmdb_api_key).toBe("");
  });
});

describe("POST /api/settings/integrations", () => {
  it("persists tmdb_api_key when provided", async () => {
    const res = await POST(makePost({ tmdb_api_key: "new-tmdb-key" }));
    expect(res.status).toBe(200);

    expect(setSetting).toHaveBeenCalledWith("tmdb_api_key", "new-tmdb-key");
    expect(store.get("tmdb_api_key")).toBe("new-tmdb-key");
  });

  it("does not touch tmdb_api_key when omitted", async () => {
    const res = await POST(makePost({ openai_api_key: "sk-test" }));
    expect(res.status).toBe(200);

    expect(setSetting).not.toHaveBeenCalledWith("tmdb_api_key", expect.anything());
  });
});
