import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { TranscriptRecorder } from "@/lib/services/liveassist/TranscriptRecorder";

// Fixed launch instant (local time) so both the filename stamp and the per-line
// time are deterministic regardless of the runner's timezone.
const LAUNCH = new Date(2026, 5, 27, 14, 30, 5); // 2026-06-27 14:30:05 local
const FILE = "liveassist-2026-06-27_14-30-05.log";

describe("TranscriptRecorder", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "transcript-rec-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not create the file until the first write (lazy)", () => {
    new TranscriptRecorder(dir, () => LAUNCH);
    expect(existsSync(join(dir, FILE))).toBe(false);
  });

  it("writes a timestamped transcript line to a launch-stamped file", () => {
    const rec = new TranscriptRecorder(dir, () => LAUNCH);
    rec.recordTranscript("bonsoir et bienvenue");
    const content = readFileSync(join(dir, FILE), "utf-8");
    expect(content).toBe("[14:30:05] bonsoir et bienvenue\n");
  });

  it("appends multiple lines to the same file", () => {
    const rec = new TranscriptRecorder(dir, () => LAUNCH);
    rec.recordTranscript("première");
    rec.recordTranscript("deuxième");
    const lines = readFileSync(join(dir, FILE), "utf-8").trim().split("\n");
    expect(lines).toEqual(["[14:30:05] première", "[14:30:05] deuxième"]);
  });

  it("trims and skips empty / whitespace-only transcript text", () => {
    const rec = new TranscriptRecorder(dir, () => LAUNCH);
    rec.recordTranscript("   ");
    rec.recordTranscript("");
    expect(existsSync(join(dir, FILE))).toBe(false); // nothing written → no file
    rec.recordTranscript("  vrai texte  ");
    expect(readFileSync(join(dir, FILE), "utf-8")).toBe("[14:30:05] vrai texte\n");
  });

  it("collapses embedded newlines so one segment stays one line (no log forging)", () => {
    const rec = new TranscriptRecorder(dir, () => LAUNCH);
    rec.recordTranscript("ligne une\nligne deux\r\n[00:00:00] forgé");
    const content = readFileSync(join(dir, FILE), "utf-8");
    expect(content).toBe("[14:30:05] ligne une ligne deux [00:00:00] forgé\n");
    expect(content.split("\n").filter(Boolean)).toHaveLength(1);
  });

  it("collapses newlines in a suggestion label too", () => {
    const rec = new TranscriptRecorder(dir, () => LAUNCH);
    rec.recordSuggestion("poster", "Titre\nmalicieux", 0.5);
    const content = readFileSync(join(dir, FILE), "utf-8");
    expect(content).toBe("[14:30:05] >> SUGGESTION poster « Titre malicieux » (0.50)\n");
  });

  it("writes a formatted suggestion line", () => {
    const rec = new TranscriptRecorder(dir, () => LAUNCH);
    rec.recordSuggestion("poster-tmdb", "Basic Instinct", 0.92);
    expect(readFileSync(join(dir, FILE), "utf-8")).toBe(
      "[14:30:05] >> SUGGESTION poster-tmdb « Basic Instinct » (0.92)\n",
    );
  });

  it("formats confidence to two decimals", () => {
    const rec = new TranscriptRecorder(dir, () => LAUNCH);
    rec.recordSuggestion("definition", "entropie", 0.6);
    expect(readFileSync(join(dir, FILE), "utf-8")).toContain("(0.60)");
  });

  it("uses the launch stamp for the filename, but the call time per line", () => {
    let current = LAUNCH;
    const rec = new TranscriptRecorder(dir, () => current);
    rec.recordTranscript("au lancement");
    current = new Date(2026, 5, 27, 14, 31, 42); // later call
    rec.recordTranscript("plus tard");
    // Filename frozen at launch; lines carry their own call time.
    const content = readFileSync(join(dir, FILE), "utf-8");
    expect(content).toBe("[14:30:05] au lancement\n[14:31:42] plus tard\n");
  });

  it("never throws when the file cannot be written, and disables itself", () => {
    // Point the recorder at a path that is actually a file → mkdir/append fail.
    const bogus = join(dir, "not-a-dir");
    writeFileSync(bogus, "x");
    const rec = new TranscriptRecorder(bogus, () => LAUNCH);
    expect(() => rec.recordTranscript("hello")).not.toThrow();
    expect(() => rec.recordSuggestion("poster", "X", 0.5)).not.toThrow();
  });
});
