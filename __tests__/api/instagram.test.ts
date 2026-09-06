/* eslint-disable @typescript-eslint/no-explicit-any */

import { basename } from "path";

// Mock all external dependencies used by the instagram route
jest.mock("child_process");
jest.mock("fs", () => ({ existsSync: jest.fn(() => true) }));
jest.mock("fs/promises");
jest.mock("@/lib/utils/fileUpload", () => ({
  getUploadDir: jest.fn(async (subfolder: string) => `/mock/data/uploads/${subfolder}`),
}));
jest.mock("@/lib/utils/downloadToLocal", () => ({
  downloadRemoteToUpload: jest.fn(),
}));

// Mutable so a test can turn the configured session on without re-mocking the module.
const mockInstagramSettings = { username: "", sessionId: "", sessionValid: false };
jest.mock("@/lib/services/SettingsService", () => ({
  SettingsService: {
    getInstance: () => ({
      getInstagramUsername: () => mockInstagramSettings.username,
      isInstagramSessionValid: () => mockInstagramSettings.sessionValid,
      getInstagramSessionId: () => mockInstagramSettings.sessionId,
      getInstagramCookieFilePath: () => "/mock/instagram-cookies.txt",
    }),
  },
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
const readdirMock = fsp.readdir as jest.MockedFunction<typeof fsp.readdir>;
const mkdirMock = fsp.mkdir as jest.MockedFunction<typeof fsp.mkdir>;
const copyFileMock = fsp.copyFile as jest.MockedFunction<typeof fsp.copyFile>;
const rmMock = fsp.rm as jest.MockedFunction<typeof fsp.rm>;
const readFileMock = fsp.readFile as jest.MockedFunction<typeof fsp.readFile>;
const writeFileMock = fsp.writeFile as jest.MockedFunction<typeof fsp.writeFile>;
const chmodMock = fsp.chmod as jest.MockedFunction<typeof fsp.chmod>;

import { downloadRemoteToUpload } from "@/lib/utils/downloadToLocal";
const downloadRemoteToUploadMock = downloadRemoteToUpload as jest.MockedFunction<
  typeof downloadRemoteToUpload
>;

import { POST } from "@/app/api/assets/instagram/route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/assets/instagram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Args of the first yt-dlp invocation, which is what the route always tries first. */
function ytDlpArgs(): string[] {
  return (execFileAsyncMock.mock.calls.find((c) => c[0] === "yt-dlp")?.[1] ?? []) as string[];
}

/** Files instaloader is pretended to have written into its temp dir. */
let instaloaderFiles: string[] = [];
/** Extension yt-dlp is pretended to have written; "" means it downloaded nothing. */
let ytDlpOutputExt = "";

beforeEach(() => {
  jest.clearAllMocks();
  mkdirMock.mockResolvedValue(undefined as any);
  copyFileMock.mockResolvedValue(undefined as any);
  rmMock.mockResolvedValue(undefined as any);
  writeFileMock.mockResolvedValue(undefined as any);
  chmodMock.mockResolvedValue(undefined as any);

  instaloaderFiles = [];
  ytDlpOutputExt = "";
  mockInstagramSettings.username = "";
  mockInstagramSettings.sessionId = "";
  mockInstagramSettings.sessionValid = false;

  // Both tools now read directories, so the mock has to answer per caller: the
  // uploads dir is scanned by name prefix, instaloader's temp dir by content.
  readdirMock.mockImplementation((async (dir: any) => {
    if (String(dir).includes("instaloader-")) return instaloaderFiles;
    if (!ytDlpOutputExt) return [];
    const args = ytDlpArgs();
    const template = String(args[args.indexOf("-o") + 1] ?? "");
    return [`${basename(template, ".%(ext)s")}.${ytDlpOutputExt}`];
  }) as any);
});

describe("POST /api/assets/instagram", () => {
  describe("input validation", () => {
    it("rejects missing type", async () => {
      const res = await POST(makeRequest({ url: "https://www.instagram.com/p/ABC/" }));

      expect(res.status).toBe(400);
    });

    it("rejects invalid type", async () => {
      const res = await POST(makeRequest({ type: "unknown" }));

      expect(res.status).toBe(400);
    });

    it("rejects media type without URL", async () => {
      const res = await POST(makeRequest({ type: "media" }));

      expect(res.status).toBe(400);
    });

    it("rejects profile type without username", async () => {
      const res = await POST(makeRequest({ type: "profile" }));

      expect(res.status).toBe(400);
    });

    it("rejects invalid username characters", async () => {
      const res = await POST(makeRequest({ type: "profile", username: "bad user!" }));

      expect(res.status).toBe(400);
    });

    it("strips @ prefix from username", async () => {
      execFileAsyncMock.mockResolvedValueOnce({ stdout: "", stderr: "" });
      instaloaderFiles = ["profile_pic.jpg"];

      const res = await POST(makeRequest({ type: "profile", username: "@testaccount" }));

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
        // `channel` is the @handle; `uploader` is the full name, which must not win.
        channel: "testuser",
        uploader: "Test User",
        ext: "mp4",
        duration: 15.5,
      };
      execFileAsyncMock.mockResolvedValueOnce({ stdout: JSON.stringify(ytdlpMeta), stderr: "" });
      ytDlpOutputExt = "mp4";

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
        stdout: JSON.stringify({ title: "Fallback title", description: "", channel: "u", ext: "mp4", duration: 10 }),
        stderr: "",
      });
      ytDlpOutputExt = "mp4";

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/reel/ABC123/",
        type: "media",
      }));

      const body = await res.json();
      expect(body.title).toBe("Fallback title");
    });

    it("calls yt-dlp anonymously with the flags Instagram needs", async () => {
      execFileAsyncMock.mockResolvedValueOnce({ stdout: JSON.stringify({ channel: "u" }), stderr: "" });
      ytDlpOutputExt = "mp4";

      await POST(makeRequest({ url: "https://www.instagram.com/reel/ABC123/", type: "media" }));

      const args = ytDlpArgs();
      expect(args).toEqual(expect.arrayContaining(["--ignore-no-formats-error", "--playlist-items", "1", "--print-json"]));
      expect(args).not.toContain("--cookies-from-browser");
      expect(args).not.toContain("--cookies");
    });

    it("passes the generated cookie file when a sessionid is configured", async () => {
      mockInstagramSettings.sessionId = "session-abc";
      execFileAsyncMock.mockResolvedValueOnce({ stdout: JSON.stringify({ channel: "u" }), stderr: "" });
      ytDlpOutputExt = "mp4";

      await POST(makeRequest({ url: "https://www.instagram.com/reel/ABC123/", type: "media" }));

      const args = ytDlpArgs();
      expect(args).toEqual(expect.arrayContaining(["--cookies", "/mock/instagram-cookies.txt"]));
      expect(writeFileMock).toHaveBeenCalledWith(
        "/mock/instagram-cookies.txt",
        expect.stringContaining("sessionid\tsession-abc"),
        expect.any(Object)
      );
    });

    it("tries yt-dlp first even for a /p/ post", async () => {
      execFileAsyncMock.mockResolvedValueOnce({ stdout: JSON.stringify({ channel: "u" }), stderr: "" });
      ytDlpOutputExt = "mp4";

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/p/ABC123/",
        type: "media",
        urlType: "post",
      }));

      expect(res.status).toBe(200);
      expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
      expect(execFileAsyncMock.mock.calls[0][0]).toBe("yt-dlp");
    });
  });

  describe("media download (image post via yt-dlp thumbnail)", () => {
    it("serves the thumbnail of an image post even though yt-dlp exits non-zero", async () => {
      // Real shape of an image post: exit 1, but the JSON was printed beforehand.
      execFileAsyncMock.mockRejectedValueOnce(Object.assign(new Error("Command failed"), {
        stdout: JSON.stringify({
          description: "Une légende\n#tag",
          channel: "john.doe",
          thumbnail: "https://scontent.cdninstagram.com/v/full.jpg",
        }),
        stderr: "ERROR: [Instagram] ABC: No video formats found!",
      }));
      downloadRemoteToUploadMock.mockResolvedValueOnce({
        url: "/data/uploads/posters/downloaded.jpg",
        filename: "downloaded.jpg",
        type: "image",
      });

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/p/ABC123/",
        type: "media",
      }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.type).toBe("image");
      expect(body.title).toBe("Une légende");
      expect(body.source).toBe("@john.doe");
      expect(body.url).toBe("/data/uploads/posters/downloaded.jpg");
      expect(downloadRemoteToUploadMock).toHaveBeenCalledWith("https://scontent.cdninstagram.com/v/full.jpg");
      // No instaloader fallback: yt-dlp did serve the post.
      expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
    });

    it("keeps the first media when a carousel prints several JSON objects", async () => {
      execFileAsyncMock.mockRejectedValueOnce(Object.assign(new Error("Command failed"), {
        stdout: [
          JSON.stringify({ description: "Premier", channel: "a", thumbnail: "https://cdn/1.jpg" }),
          JSON.stringify({ description: "Second", channel: "a", thumbnail: "https://cdn/2.jpg" }),
        ].join("\n"),
        stderr: "",
      }));
      downloadRemoteToUploadMock.mockResolvedValueOnce({
        url: "/data/uploads/posters/one.jpg",
        filename: "one.jpg",
        type: "image",
      });

      const res = await POST(makeRequest({ url: "https://www.instagram.com/p/ABC/", type: "media" }));

      const body = await res.json();
      expect(body.title).toBe("Premier");
      expect(downloadRemoteToUploadMock).toHaveBeenCalledWith("https://cdn/1.jpg");
      expect(ytDlpArgs()).toEqual(expect.arrayContaining(["--playlist-items", "1"]));
    });

    it("discards a partial download instead of serving the thumbnail instead", async () => {
      // A killed reel download leaves only a `.part`; serving its poster image
      // silently would swap the user's video for a still.
      execFileAsyncMock.mockRejectedValueOnce(Object.assign(new Error("Command timed out"), {
        killed: true,
        stdout: JSON.stringify({ channel: "a", thumbnail: "https://cdn/1.jpg" }),
        stderr: "",
      }));
      ytDlpOutputExt = "mp4.part";
      execFileAsyncMock.mockRejectedValueOnce(Object.assign(new Error("instaloader failed"), { stderr: "" }));

      const res = await POST(makeRequest({ url: "https://www.instagram.com/reel/ABC/", type: "media" }));

      expect(res.status).toBe(408);
      expect(downloadRemoteToUploadMock).not.toHaveBeenCalled();
      expect(rmMock).toHaveBeenCalledWith(expect.stringContaining(".mp4.part"), { force: true });
    });
  });

  describe("media download (instaloader fallback)", () => {
    it("falls back to instaloader when yt-dlp cannot read the post", async () => {
      execFileAsyncMock.mockRejectedValueOnce(new Error("No video found"));
      execFileAsyncMock.mockResolvedValueOnce({ stdout: "", stderr: "" });
      instaloaderFiles = ["2026-01-30_UTC.txt", "2026-01-30_UTC_1.jpg"];
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
      instaloaderFiles = ["photo.jpg"];

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
      instaloaderFiles = ["profile_pic.jpg"];

      const res = await POST(makeRequest({ username: "testaccount", type: "profile" }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toMatch(/^\/data\/uploads\/guests\/.+\.jpg$/);
    });
  });

  describe("error handling", () => {
    it("returns 503 telling the user to update yt-dlp when impersonation is unavailable", async () => {
      execFileAsyncMock.mockRejectedValueOnce(Object.assign(new Error("Command failed"), {
        stderr: "ERROR: The extractor is attempting impersonation, but no impersonate target is available",
      }));
      execFileAsyncMock.mockRejectedValueOnce(Object.assign(new Error("Command failed"), {
        stderr: "JSON Query to graphql/query: 403 Forbidden\n",
      }));

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/p/ABC123/",
        type: "media",
      }));

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toMatch(/yt-dlp/i);
      expect(body.error).toMatch(/2026\.08\.19/);
    });

    it("returns 500 when both yt-dlp and instaloader fail with unknown errors", async () => {
      execFileAsyncMock.mockRejectedValueOnce(new Error("yt-dlp crashed"));
      execFileAsyncMock.mockRejectedValueOnce(new Error("instaloader crashed"));

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/reel/ABC/",
        type: "media",
      }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it("returns 500 on unknown instaloader failure for profile", async () => {
      execFileAsyncMock.mockRejectedValueOnce(new Error("instaloader failed"));

      const res = await POST(makeRequest({ username: "nonexistent", type: "profile" }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it("returns 404 when profile does not exist", async () => {
      const err = Object.assign(new Error("Command failed"), {
        stderr: "juliencr86: Profile juliencr86 does not exist.\n",
      });
      execFileAsyncMock.mockRejectedValueOnce(err);

      const res = await POST(makeRequest({ username: "juliencr86", type: "profile" }));

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/introuvable/i);
    });

    it("tells a profile fetch that only it needs a session", async () => {
      const err = Object.assign(new Error("Command failed"), {
        stderr: "JSON Query to graphql/query: 403 Forbidden\n",
      });
      execFileAsyncMock.mockRejectedValueOnce(err);

      const res = await POST(makeRequest({ username: "testuser", type: "profile" }));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/authentification/i);
      expect(body.error).toMatch(/photo de profil/i);
      expect(body.error).toMatch(/sessionid/i);
    });

    it("returns 429 when Instagram rate limits requests", async () => {
      const err = Object.assign(new Error("Command failed"), {
        stderr: "Please wait a few minutes before you try again.\n",
      });
      execFileAsyncMock.mockRejectedValueOnce(err);

      const res = await POST(makeRequest({ username: "testuser", type: "profile" }));

      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toMatch(/limité|réessayez/i);
    });

    it("returns 401 when Instagram asks for a checkpoint challenge", async () => {
      const err = Object.assign(new Error("Command failed"), {
        stderr: "Checkpoint required — please verify your account.\n",
      });
      execFileAsyncMock.mockRejectedValueOnce(err);

      const res = await POST(makeRequest({ username: "testuser", type: "profile" }));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/expirée|reconnect/i);
    });

    it("returns 401 when session file has bad credentials", async () => {
      const err = Object.assign(new Error("Command failed"), {
        stderr: "Bad credentials for user testuser.\n",
      });
      execFileAsyncMock.mockRejectedValueOnce(err);

      const res = await POST(makeRequest({ username: "testuser", type: "profile" }));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/identifiants|invalides/i);
    });

    it("returns 404 with specific message when no profile picture is found", async () => {
      const err = Object.assign(new Error("Command failed"), {
        stderr: "No profile picture found for this account.\n",
      });
      execFileAsyncMock.mockRejectedValueOnce(err);

      const res = await POST(makeRequest({ username: "testuser", type: "profile" }));

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/photo de profil/i);
    });

    it("returns 408 on timeout from instaloader (killed process)", async () => {
      execFileAsyncMock.mockRejectedValueOnce(new Error("No video found"));
      const timeoutErr = Object.assign(new Error("Command timed out"), { killed: true });
      execFileAsyncMock.mockRejectedValueOnce(timeoutErr);

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/reel/ABC/",
        type: "media",
      }));

      expect(res.status).toBe(408);
    });

    it("returns 408 on timeout with ETIMEDOUT code", async () => {
      execFileAsyncMock.mockRejectedValueOnce(new Error("No video found"));
      const timeoutErr = Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" });
      execFileAsyncMock.mockRejectedValueOnce(timeoutErr);

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/reel/ABC/",
        type: "media",
      }));

      expect(res.status).toBe(408);
    });

    it("returns 408 on profile download timeout with a user-facing timeout message", async () => {
      const timeoutErr = Object.assign(new Error("Command timed out"), { killed: true });
      execFileAsyncMock.mockRejectedValueOnce(timeoutErr);

      const res = await POST(makeRequest({ username: "slowaccount", type: "profile" }));

      expect(res.status).toBe(408);
      const body = await res.json();
      expect(body.error).toMatch(/timeout|délai/i);
    });

    it("returns 500 when instaloader finds no media (shortcode valid but empty)", async () => {
      execFileAsyncMock.mockRejectedValueOnce(new Error("No video found"));
      execFileAsyncMock.mockResolvedValueOnce({ stdout: "", stderr: "" });
      instaloaderFiles = ["metadata.txt"];
      readFileMock.mockResolvedValueOnce("owner\t||||\tcaption" as any);

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/p/ABC123/",
        type: "media",
      }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it("returns 500 when shortcode extraction fails for media", async () => {
      execFileAsyncMock.mockRejectedValueOnce(new Error("No video found"));

      const res = await POST(makeRequest({
        url: "https://www.instagram.com/explore/tags/test/",
        type: "media",
      }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });
  });
});
