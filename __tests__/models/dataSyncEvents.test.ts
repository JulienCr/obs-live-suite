import { parseDataChangedEvent } from "@/lib/models/DataSyncEvents";

describe("parseDataChangedEvent", () => {
  const inner = { type: "data-changed", entity: "posters", action: "created", clientId: "unknown", timestamp: 1 };

  it("unwraps the OverlayEvent-wrapped form produced by ChannelManager.publish()", () => {
    // This is the shape the dashboard actually receives — the regression that broke
    // every cross-process refresh (Live Assist poster / text-preset).
    const wrapped = { channel: "system", type: "data-changed", payload: inner, timestamp: 2, id: "x" };
    const event = parseDataChangedEvent(wrapped);
    expect(event?.entity).toBe("posters");
    expect(event?.clientId).toBe("unknown");
  });

  it("accepts a flat data-changed event defensively", () => {
    expect(parseDataChangedEvent(inner)?.entity).toBe("posters");
  });

  it("returns null for non-data-changed messages", () => {
    expect(parseDataChangedEvent({ channel: "system", type: "something-else", payload: {} })).toBeNull();
    expect(parseDataChangedEvent({ type: "data-changed", payload: { type: "data-changed" } })).toBeNull(); // missing entity/clientId
    expect(parseDataChangedEvent(null)).toBeNull();
    expect(parseDataChangedEvent("nope")).toBeNull();
  });
});
