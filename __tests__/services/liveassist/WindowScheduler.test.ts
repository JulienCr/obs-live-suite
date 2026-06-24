import { WindowScheduler } from "@/lib/services/liveassist/WindowScheduler";

describe("WindowScheduler", () => {
  it("does not fire before +afterMs of context arrives", () => {
    const s = new WindowScheduler(15000, 20000);
    s.register({ providerId: "poster", keyword: "spectacle", tHit: 10000 }, 0);
    expect(s.collectReady(20000, 1000)).toEqual([]); // latestT1=20000 < 25000
  });

  it("fires once context reaches tHit + afterMs", () => {
    const s = new WindowScheduler(15000, 20000);
    s.register({ providerId: "poster", keyword: "spectacle", tHit: 10000 }, 0);
    const ready = s.collectReady(25000, 1000);
    expect(ready).toEqual([{ providerIds: ["poster"], tCenter: 10000 }]);
  });

  it("coalesces nearby hits into one window, merging providerIds", () => {
    const s = new WindowScheduler(15000, 20000);
    s.register({ providerId: "poster", keyword: "spectacle", tHit: 10000 }, 0);
    s.register({ providerId: "definition", keyword: "définition", tHit: 12000 }, 0);
    const ready = s.collectReady(30000, 1000);
    expect(ready).toHaveLength(1);
    expect(ready[0].providerIds.sort()).toEqual(["definition", "poster"]);
  });

  it("fires by wall-clock max-wait when audio stops", () => {
    const s = new WindowScheduler(15000, 20000);
    s.register({ providerId: "poster", keyword: "spectacle", tHit: 10000 }, 1000);
    // latestT1 stuck at 12000 (<25000) but wall clock advanced past maxWait
    expect(s.collectReady(12000, 1000 + 20001)).toHaveLength(1);
  });

  it("each window fires only once", () => {
    const s = new WindowScheduler(15000, 20000);
    s.register({ providerId: "poster", keyword: "spectacle", tHit: 10000 }, 0);
    expect(s.collectReady(25000, 1000)).toHaveLength(1);
    expect(s.collectReady(25000, 1000)).toHaveLength(0);
  });
});
