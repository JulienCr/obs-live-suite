/* eslint-disable @typescript-eslint/no-explicit-any */

// Capture poster creates without touching the database
const mockCreate = jest.fn();
jest.mock("@/lib/repositories/PosterRepository", () => ({
  PosterRepository: {
    getInstance: () => ({
      create: mockCreate,
      getAll: jest.fn(() => []),
    }),
  },
}));

// Avoid backend broadcast side effects
jest.mock("@/lib/utils/broadcastDataChange", () => ({
  broadcastDataChange: jest.fn(),
}));

// Avoid real disk writes when a download succeeds
jest.mock("fs/promises", () => ({
  writeFile: jest.fn(async () => undefined),
}));
jest.mock("@/lib/utils/fileUpload", () => ({
  getUploadDir: jest.fn(async (subfolder: string) => `/mock/data/uploads/${subfolder}`),
}));

import { POST } from "@/app/api/assets/posters/route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/assets/posters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function imageResponse(contentType = "image/jpeg"): Response {
  return new Response("fake-bytes", { status: 200, headers: { "content-type": contentType } });
}

const REMOTE_URL = "https://example.com/poster.jpg";

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("POST /api/assets/posters — downloadToLocal", () => {
  it("rewrites a remote fileUrl to a local /data/uploads path when downloadToLocal is true", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(imageResponse("image/jpeg"));

    const res = await POST(
      makeRequest({ title: "Remote", fileUrl: REMOTE_URL, type: "image", downloadToLocal: true })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.poster.fileUrl).toMatch(/^\/data\/uploads\/posters\/.+\.jpg$/);
    // Persisted poster carries the local URL, not the remote one
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].fileUrl).toMatch(/^\/data\/uploads\/posters\//);
  });

  it("leaves the fileUrl untouched when downloadToLocal is absent", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    const res = await POST(makeRequest({ title: "Remote", fileUrl: REMOTE_URL, type: "image" }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.poster.fileUrl).toBe(REMOTE_URL);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not download for a YouTube poster even when downloadToLocal is true", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    const res = await POST(
      makeRequest({
        title: "YT",
        fileUrl: "https://youtube.com/watch?v=abc",
        type: "youtube",
        downloadToLocal: true,
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.poster.fileUrl).toBe("https://youtube.com/watch?v=abc");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still creates the poster with the remote URL when the download fails", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const res = await POST(
      makeRequest({ title: "Remote", fileUrl: REMOTE_URL, type: "image", downloadToLocal: true })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.poster.fileUrl).toBe(REMOTE_URL);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
