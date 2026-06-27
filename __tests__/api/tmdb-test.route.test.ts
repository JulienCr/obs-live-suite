/* eslint-disable @typescript-eslint/no-explicit-any */

const testConnection = jest.fn();

jest.mock("@/lib/services/TmdbResolverService", () => ({
  TmdbResolverService: { getInstance: jest.fn(() => ({ testConnection })) },
}));

import { POST } from "@/app/api/settings/integrations/tmdb-test/route";

const makePost = (body: unknown): Request =>
  new Request("http://localhost:3000/api/settings/integrations/tmdb-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => jest.clearAllMocks());

describe("POST /api/settings/integrations/tmdb-test", () => {
  it("forwards the typed key and returns success on a valid key", async () => {
    testConnection.mockResolvedValue({ ok: true, message: "Connexion TMDB OK." });
    const res = await POST(makePost({ apiKey: "TYPED" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/OK/);
    expect(testConnection).toHaveBeenCalledWith("TYPED");
  });

  it("returns 200 with success:false for an invalid key (not a server error)", async () => {
    testConnection.mockResolvedValue({ ok: false, message: "Clé TMDB invalide (401)." });
    const res = await POST(makePost({ apiKey: "BAD" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/invalide/i);
  });

  it("passes undefined when no key is sent (resolver falls back to stored)", async () => {
    testConnection.mockResolvedValue({ ok: true, message: "Connexion TMDB OK." });
    const res = await POST(makePost({}));
    expect(res.status).toBe(200);
    expect(testConnection).toHaveBeenCalledWith(undefined);
  });
});
