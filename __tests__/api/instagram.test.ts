/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock all external dependencies used by the instagram route
jest.mock("child_process");
jest.mock("fs", () => ({ existsSync: jest.fn(() => true) }));
jest.mock("fs/promises");
jest.mock("@/lib/config/PathManager", () => ({
  PathManager: { getInstance: () => ({ getDataDir: () => "/mock/data" }) },
}));
jest.mock("@/lib/services/SettingsService", () => ({
  SettingsService: { getInstance: () => ({ getInstagramCookiesBrowser: () => "chrome" }) },
}));

// The route does: const execFileAsync = promisify(execFile)
// promisify is called at module init, so the mock must be self-contained
const _sharedExecMock = jest.fn();
jest.mock("util", () => {
  const mock = jest.fn();
  // Store on globalThis so we can retrieve it after import
  (globalThis as any).__execFileAsyncMock = mock;
  return { promisify: () => mock };
});

const execFileAsyncMock: jest.Mock = (globalThis as any).__execFileAsyncMock ?? _sharedExecMock;

// Get mock references from mocked modules
import * as fsp from "fs/promises";
const mkdirMock = fsp.mkdir as jest.MockedFunction<typeof fsp.mkdir>;
const readdirMock = fsp.readdir as jest.MockedFunction<typeof fsp.readdir>;
const copyFileMock = fsp.copyFile as jest.MockedFunction<typeof fsp.copyFile>;
const rmMock = fsp.rm as jest.MockedFunction<typeof fsp.rm>;
const readFileMock = fsp.readFile as jest.MockedFunction<typeof fsp.readFile>;

import { POST } from "@/app/api/assets/instagram/route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/assets/instagram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mkdirMock.mockResolvedValue(undefined as any);
  copyFileMock.mockResolvedValue(undefined as any);
  rmMock.mockResolvedValue(undefined as any);
});

describe("POST /api/assets/instagram", () => {
  describe("input validation", () => {
    it("rejects missing type", async () => {
      const res = await POST(makeRequest({ url: "https://instagram.com/p/ABC" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid type/);
    });

    it("rejects invalid type", async () => {
      const res = await POST(makeRequest({ url: "x", type: "unknown" }));
      expect(res.status).toBe(400);
    });

    it("rejects media type without URL", async () => {
      const res = await POST(makeRequest({ type: "media" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/No URL provided/);
    });

    it("rejects profile type without username", async () => {
      const res = await POST(makeRequest({ type: "profile" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/No username provided/);
    });

    it("rejects invalid username characters", async () => {
      const res = await POST(makeRequest({ username: "has spaces!", type: "profile" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid Instagram username/);
    });

    it("strips @ prefix from username", async () => {
      execFileAsyncMock.mockResolvedValueOnce({ stdout: "", stderr: "" });
      readdirMock.mockResolvedValueOnce(["profile_pic.jpg"] as any);

      const res = await POST(makeRequest({ username: "@testaccount", type: "profile" }));
      expect(res.status).toBe(200);
      expect(execFileAsyncMock).toHaveBeenCalledWith(
        "instaloader",
        expect.arrayContaining(["testaccount"]),
        expect.any(Object)
      );
    });
  });

  describe("media download (video via yt-dlp)", () => {
    it("downloads video and returns metadata with duration", async () => {
      const ytdlpMeta = {
        title: "Reel title",
        description: "First line of caption\n#hashtags",
        uploader: "testuser",
        ext: "mp4",
        duration: 15.5,
        _filename: "/mock/data/uploads/posters/test-uuid.mp4",
      };

      // Single yt-dlp call with --print-json downloads and returns metadata
      execFileAsyncMock.mockResolvedValueOnce({ stdout: JSON.stringify(ytdlpMeta), stderr: "" });

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/reel/ABC123/",
        type: "media",
      }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.type).toBe("video");
      expect(body.title).toBe("First line of caption");
      expect(body.source).toBe("@testuser");
      expect(body.duration).toBe(16);
      expect(body.url).toMatch(/^\/data\/uploads\/posters\/.+\.mp4$/);
    });

    it("falls back to meta.title when description is empty", async () => {
      execFileAsyncMock.mockResolvedValueOnce({
        stdout: JSON.stringify({ title: "Fallback title", description: "", uploader: "u", ext: "mp4", duration: 10, _filename: "/mock/data/uploads/posters/test.mp4" }),
        stderr: "",
      });

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/reel/ABC123/",
        type: "media",
      }));

      const body = await res.json();
      expect(body.title).toBe("Fallback title");
    });
  });

  describe("media download (image via instaloader fallback)", () => {
    it("falls back to instaloader when yt-dlp fails (image post)", async () => {
      // yt-dlp --print-json fails for image-only posts
      execFileAsyncMock.mockRejectedValueOnce(new Error("No video found"));
      // instaloader call succeeds
      execFileAsyncMock.mockResolvedValueOnce({ stdout: "", stderr: "" });
      readdirMock.mockResolvedValueOnce(["2026-01-30_UTC.txt", "2026-01-30_UTC_1.jpg"] as any);
      readFileMock.mockResolvedValueOnce("john.doe\t||||\tTest post caption\n#test" as any);

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/p/DUJKX_SDBun/",
        type: "media",
      }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.type).toBe("image");
      expect(body.title).toBe("Test post caption");
      expect(body.source).toBe("@john.doe");
      expect(body.duration).toBeNull();
      expect(body.url).toMatch(/^\/data\/uploads\/posters\/.+\.jpg$/);
    });

    it("uses 'Instagram' as fallback when no metadata txt", async () => {
      execFileAsyncMock.mockRejectedValueOnce(new Error("No video found"));
      execFileAsyncMock.mockResolvedValueOnce({ stdout: "", stderr: "" });
      readdirMock.mockResolvedValueOnce(["photo.jpg"] as any);

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/p/ABC123/",
        type: "media",
      }));

      const body = await res.json();
      expect(body.title).toBe("Instagram");
      expect(body.source).toBe("Instagram");
    });
  });

  describe("profile picture download", () => {
    it("downloads profile picture via instaloader", async () => {
      execFileAsyncMock.mockResolvedValueOnce({ stdout: "", stderr: "" });
      readdirMock.mockResolvedValueOnce(["profile_pic.jpg"] as any);

      const res = await POST(makeRequest({ username: "testaccount", type: "profile" }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toMatch(/^\/data\/uploads\/guests\/.+\.jpg$/);
    });

    it("uses url field as username fallback", async () => {
      execFileAsyncMock.mockResolvedValueOnce({ stdout: "", stderr: "" });
      readdirMock.mockResolvedValueOnce(["pic.jpg"] as any);

      const res = await POST(makeRequest({ url: "testaccount", type: "profile" }));
      expect(res.status).toBe(200);
    });
  });

  describe("error handling", () => {
    it("returns 500 when both yt-dlp and instaloader fail", async () => {
      // yt-dlp fails → falls back to instaloader → instaloader also fails
      execFileAsyncMock.mockRejectedValueOnce(new Error("yt-dlp crashed"));
      execFileAsyncMock.mockRejectedValueOnce(new Error("instaloader crashed"));

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/reel/ABC/",
        type: "media",
      }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toMatch(/instaloader crashed/);
    });

    it("returns 500 on instaloader failure for profile", async () => {
      execFileAsyncMock.mockRejectedValueOnce(new Error("instaloader failed"));

      const res = await POST(makeRequest({ username: "nonexistent", type: "profile" }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toMatch(/instaloader failed/);
    });

    it("returns 408 on timeout from instaloader", async () => {
      // yt-dlp fails → falls back to instaloader → instaloader times out
      execFileAsyncMock.mockRejectedValueOnce(new Error("No video found"));
      execFileAsyncMock.mockRejectedValueOnce(new Error("ETIMEOUT"));

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/reel/ABC/",
        type: "media",
      }));

      expect(res.status).toBe(408);
    });
  });
});
