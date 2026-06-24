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
});
