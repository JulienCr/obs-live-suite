import express from "express";
import request from "supertest";
import { createLiveAssistRouter } from "@/server/api/live-assist";
import { SuggestionStore } from "@/lib/services/liveassist/SuggestionStore";
import { ProviderRegistry } from "@/lib/services/liveassist/providers/ActionProvider";
import { PosterActionProvider } from "@/lib/services/liveassist/providers/PosterActionProvider";

// Higher-fidelity than the unit test: wires the REAL router + REAL store + REAL
// registry + REAL PosterActionProvider, exercising the full backend apply chain
// minus the HTTP hop to the frontend (createPoster is spied). Proves whether a
// "Valider" on a fresh, stored film suggestion reaches poster creation.
describe("live-assist apply — backend integration", () => {
  function setup() {
    const events: any[] = [];
    const store = new SuggestionStore((e) => events.push(e), { now: () => 0, makeId: () => "sug-1" });
    const registry = new ProviderRegistry();
    const createPoster = jest.fn(async () => ({ ok: true as const }));
    const resolver = { resolveAndFetch: jest.fn() }; // not used by apply
    registry.register(
      new PosterActionProvider(resolver, createPoster, {
        id: "poster-tmdb",
        description: "TMDB",
        defaultKeywords: ["film"],
      }),
    );
    const orchestrator = { ingestSegment: jest.fn(), getStatus: () => ({}), markSttAlive: jest.fn() } as any;
    const app = express().use(express.json()).use(createLiveAssistRouter({ orchestrator, store, registry }));
    return { app, store, createPoster, events };
  }

  it("creates the poster when a stored poster-tmdb suggestion is validated", async () => {
    const { app, store, createPoster } = setup();
    const stored = store.add({
      intent: "poster-tmdb",
      entity: "Titanic",
      title: "Titanic",
      preview: { kind: "image", imageUrl: "https://image.tmdb.org/t/p/w780/x.jpg" },
      triggerExcerpt: "on a vu Titanic",
      applyPayload: { title: "Titanic", fileUrl: "https://image.tmdb.org/t/p/w780/x.jpg" },
      confidence: 0.9,
    })!;

    const res = await request(app).post(`/api/live-assist/suggestions/${stored.id}/apply`).send({ target: "pin" });

    expect(res.status).toBe(200);
    expect(createPoster).toHaveBeenCalledWith({ title: "Titanic", fileUrl: "https://image.tmdb.org/t/p/w780/x.jpg" });
  });

  it("404s for a stale id whose suggestion no longer exists (e.g. after a backend restart)", async () => {
    const { app, createPoster } = setup();
    const res = await request(app).post(`/api/live-assist/suggestions/ghost-id/apply`).send({ target: "pin" });
    expect(res.status).toBe(404);
    expect(createPoster).not.toHaveBeenCalled();
  });
});
