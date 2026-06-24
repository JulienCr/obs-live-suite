import { TranscriptBuffer } from "@/lib/services/liveassist/TranscriptBuffer";

const seg = (text: string, t0: number, t1: number) => ({ text, t0, t1, final: true });

describe("TranscriptBuffer", () => {
  it("returns concatenated text within a window", () => {
    const b = new TranscriptBuffer();
    b.append(seg("avant", 0, 1000));
    b.append(seg("le spectacle Le Cid", 9000, 11000));
    b.append(seg("après contexte", 20000, 22000));
    const w = b.windowAround(10000, 15000, 15000); // [-5000, 25000]
    expect(w.text).toBe("avant le spectacle Le Cid après contexte");
  });

  it("excludes segments outside the window", () => {
    const b = new TranscriptBuffer();
    b.append(seg("trop tôt", 0, 1000));
    b.append(seg("au centre", 30000, 31000));
    const w = b.windowAround(30000, 5000, 5000); // [25000, 35000]
    expect(w.text).toBe("au centre");
  });

  it("evicts segments older than retention", () => {
    const b = new TranscriptBuffer(10000);
    b.append(seg("vieux", 0, 1000));
    b.append(seg("récent", 100000, 101000));
    const w = b.windowAround(0, 5000, 5000);
    expect(w.text).toBe(""); // "vieux" evicted once latest jumped to 101000
  });

  it("tracks latestT1", () => {
    const b = new TranscriptBuffer();
    expect(b.latestT1()).toBe(0);
    b.append(seg("a", 0, 500));
    b.append(seg("b", 1000, 2000));
    expect(b.latestT1()).toBe(2000);
  });
});
