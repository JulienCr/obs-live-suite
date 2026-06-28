import express from "express";
import request from "supertest";
import { createLiveAssistRouter } from "@/server/api/live-assist";

describe("live-assist backend router", () => {
  it("accepts a valid segment and forwards it to the orchestrator", async () => {
    const ingested: any[] = [];
    const orchestrator = {
      ingestSegment: async (s: any) => { ingested.push(s); },
      getStatus: () => ({ connected: true, device: "mic" }),
    } as any;
    const store = { list: () => [], setStatus: () => undefined } as any;
    const app = express().use(express.json()).use(createLiveAssistRouter({ orchestrator, store, registry: { get: () => undefined } as any }));

    const res = await request(app).post("/api/stt/segment").send({ text: "le spectacle", t0: 0, t1: 1000, final: true });
    expect(res.status).toBe(200);
    expect(ingested).toHaveLength(1);
  });

  it("rejects an invalid segment", async () => {
    const app = express().use(express.json()).use(createLiveAssistRouter({
      orchestrator: { ingestSegment: async () => {}, getStatus: () => ({}) } as any,
      store: { list: () => [], setStatus: () => undefined } as any,
      registry: { get: () => undefined } as any,
    }));
    const res = await request(app).post("/api/stt/segment").send({ text: "x", t0: 5000, t1: 1000, final: true });
    expect(res.status).toBe(400);
  });

  it("clears all suggestions", async () => {
    const clear = jest.fn();
    const store = { list: () => [], setStatus: () => undefined, clear } as any;
    const app = express()
      .use(express.json())
      .use(createLiveAssistRouter({ orchestrator: { getStatus: () => ({}) } as any, store, registry: { get: () => undefined } as any }));

    const res = await request(app).post("/api/live-assist/suggestions/clear");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(clear).toHaveBeenCalledTimes(1);
  });

  describe("authoritative apply", () => {
    const buildApp = (suggestion: any, apply: jest.Mock, registryGet = jest.fn()) => {
      const setStatus = jest.fn();
      registryGet.mockReturnValue(suggestion ? { apply } : undefined);
      const store = { list: () => [], get: (id: string) => (suggestion?.id === id ? suggestion : undefined), setStatus } as any;
      const app = express()
        .use(express.json())
        .use(createLiveAssistRouter({ orchestrator: {} as any, store, registry: { get: registryGet } as any }));
      return { app, setStatus, registryGet };
    };

    it("uses the STORED intent + applyPayload and ignores forged client intent/payload", async () => {
      const apply = jest.fn(async () => ({ ok: true }));
      const suggestion = { id: "s1", intent: "definition", applyPayload: { target: "pin", text: "hello" } };
      const { app, setStatus, registryGet } = buildApp(suggestion, apply);

      const res = await request(app)
        .post("/api/live-assist/suggestions/s1/apply")
        .send({ target: "on-air", intent: "FORGED", payload: { evil: true } });

      expect(res.status).toBe(200);
      expect(registryGet).toHaveBeenCalledWith("definition"); // stored intent, not "FORGED"
      expect(apply).toHaveBeenCalledWith({ target: "on-air", text: "hello" }); // merged stored payload, only target trusted (no "evil")
      expect(setStatus).toHaveBeenCalledWith("s1", "applied");
    });

    it("ignores an out-of-range target", async () => {
      const apply = jest.fn(async () => ({ ok: true }));
      const suggestion = { id: "s2", intent: "poster", applyPayload: { title: "T", fileUrl: "u" } };
      const { app } = buildApp(suggestion, apply);
      await request(app).post("/api/live-assist/suggestions/s2/apply").send({ target: "garbage" });
      expect(apply).toHaveBeenCalledWith({ title: "T", fileUrl: "u" }); // no bogus target merged
    });

    it("merges a local-poster 'left'/'right' side target into the stored payload", async () => {
      const apply = jest.fn(async () => ({ ok: true }));
      const suggestion = { id: "lp1", intent: "local-poster", applyPayload: { posterId: "p3", fileUrl: "u", type: "image" } };
      const { app } = buildApp(suggestion, apply);
      await request(app).post("/api/live-assist/suggestions/lp1/apply").send({ target: "right" });
      expect(apply).toHaveBeenCalledWith({ posterId: "p3", fileUrl: "u", type: "image", target: "right" });
    });

    it("404s when the suggestion id is unknown", async () => {
      const { app } = buildApp(null, jest.fn());
      const res = await request(app).post("/api/live-assist/suggestions/nope/apply").send({ target: "pin" });
      expect(res.status).toBe(404);
    });
  });
});
