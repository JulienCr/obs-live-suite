import { SuggestionStore } from "@/lib/services/liveassist/SuggestionStore";

const built = (entity: string) => ({
  intent: "poster", entity, title: entity,
  preview: { kind: "image" as const, imageUrl: "u" },
  triggerExcerpt: "x", applyPayload: {}, confidence: 0.9,
});

describe("SuggestionStore", () => {
  it("adds a suggestion and publishes suggestion:new", () => {
    const events: any[] = [];
    let t = 1000;
    const store = new SuggestionStore((e) => events.push(e), { now: () => t, makeId: () => "id1" });
    const s = store.add(built("Le Cid"));
    expect(s?.id).toBe("id1");
    expect(s?.status).toBe("pending");
    expect(events[0]).toEqual({ type: "suggestion:new", payload: { suggestion: s } });
  });

  it("dedupes same (intent, entity) within the window", () => {
    let t = 1000;
    const store = new SuggestionStore(() => {}, { now: () => t, dedupWindowMs: 10000, makeId: () => String(t) });
    store.add(built("Le Cid"));
    t = 5000;
    expect(store.add(built("Le Cid"))).toBeNull(); // within 10s
    t = 20000;
    expect(store.add(built("Le Cid"))).not.toBeNull(); // window elapsed
  });

  it("setStatus updates and publishes suggestion:update", () => {
    const events: any[] = [];
    const store = new SuggestionStore((e) => events.push(e), { now: () => 1, makeId: () => "id1" });
    store.add(built("X"));
    const updated = store.setStatus("id1", "applied");
    expect(updated?.status).toBe("applied");
    expect(events.at(-1)).toEqual({ type: "suggestion:update", payload: { id: "id1", status: "applied" } });
  });

  it("does not publish when a suggestion is deduped", () => {
    const events: any[] = [];
    let t = 1000;
    const store = new SuggestionStore((e) => events.push(e), { now: () => t, dedupWindowMs: 10000, makeId: () => String(t) });
    store.add(built("Le Cid"));   // publishes
    t = 5000;
    store.add(built("Le Cid"));   // deduped → must NOT publish
    expect(events).toHaveLength(1);
    t = 20000;
    store.add(built("Le Cid"));   // window elapsed → publishes again
    expect(events).toHaveLength(2);
  });

  it("list() returns a copy, not the internal array", () => {
    const store = new SuggestionStore(() => {}, { now: () => 1, makeId: () => "id" });
    store.add(built("X"));
    const copy = store.list();
    copy.push({} as never);
    expect(store.list()).toHaveLength(1);
  });
});
