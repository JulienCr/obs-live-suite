/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock disk + upload-dir so nothing is written for real
jest.mock("fs/promises", () => ({
  writeFile: jest.fn(async () => undefined),
}));
jest.mock("@/lib/utils/fileUpload", () => ({
  getUploadDir: jest.fn(async (subfolder: string) => `/mock/data/uploads/${subfolder}`),
}));

import { writeFile } from "fs/promises";
import {
  downloadRemoteToUpload,
  DownloadError,
  resolvePosterFileUrl,
} from "@/lib/utils/downloadToLocal";

const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;

function imageResponse(contentType = "image/jpeg", body = "fake-bytes"): Response {
  return new Response(body, { status: 200, headers: { "content-type": contentType } });
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("downloadRemoteToUpload", () => {
  it("downloads and persists an image, returning a /data/uploads URL", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(imageResponse("image/jpeg"));

    const result = await downloadRemoteToUpload("https://example.com/x.jpg");

    expect(result.type).toBe("image");
    expect(result.url).toMatch(/^\/data\/uploads\/posters\/[0-9a-f-]+\.jpg$/);
    expect(result.filename).toMatch(/\.jpg$/);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("derives extension from Content-Type when the URL has none", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(imageResponse("image/png"));

    const result = await downloadRemoteToUpload("https://example.com/image-no-ext");

    expect(result.url).toMatch(/\.png$/);
  });

  it("classifies videos by Content-Type", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(imageResponse("video/mp4"));

    const result = await downloadRemoteToUpload("https://example.com/clip.mp4");

    expect(result.type).toBe("video");
    expect(result.url).toMatch(/\.mp4$/);
  });

  it("throws DownloadError(400) on a non-OK response", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response("nope", { status: 404, statusText: "Not Found" })
    );

    await expect(downloadRemoteToUpload("https://example.com/x.jpg")).rejects.toMatchObject({
      status: 400,
    });
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("throws DownloadError(400) for an unsupported content type", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response("<html>", { status: 200, headers: { "content-type": "text/html" } })
    );

    await expect(downloadRemoteToUpload("https://example.com/x")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("throws DownloadError(400) when content-length exceeds 50MB", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response("x", {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "content-length": String(60 * 1024 * 1024),
        },
      })
    );

    await expect(downloadRemoteToUpload("https://example.com/x.jpg")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("throws DownloadError(408) on a timeout/abort", async () => {
    const timeoutErr = Object.assign(new Error("The operation timed out"), {
      name: "TimeoutError",
    });
    jest.spyOn(global, "fetch").mockRejectedValue(timeoutErr);

    await expect(downloadRemoteToUpload("https://example.com/x.jpg")).rejects.toMatchObject({
      status: 408,
    });
  });

  it("throws DownloadError(400) on a network (TypeError) failure", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    await expect(downloadRemoteToUpload("https://example.com/x.jpg")).rejects.toBeInstanceOf(
      DownloadError
    );
    await expect(downloadRemoteToUpload("https://example.com/x.jpg")).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe("resolvePosterFileUrl", () => {
  it("rewrites a remote URL to a local path when downloadToLocal is true", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(imageResponse("image/jpeg"));

    const out = await resolvePosterFileUrl("https://example.com/x.jpg", "image", true);

    expect(out).toMatch(/^\/data\/uploads\/posters\//);
  });

  it("leaves the URL untouched when downloadToLocal is falsy", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    const out = await resolvePosterFileUrl("https://example.com/x.jpg", "image", undefined);

    expect(out).toBe("https://example.com/x.jpg");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never downloads a YouTube poster even when downloadToLocal is true", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    const out = await resolvePosterFileUrl(
      "https://youtube.com/watch?v=abc",
      "youtube",
      true
    );

    expect(out).toBe("https://youtube.com/watch?v=abc");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("leaves an already-local /data path untouched", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    const out = await resolvePosterFileUrl("/data/uploads/posters/x.jpg", "image", true);

    expect(out).toBe("/data/uploads/posters/x.jpg");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to the remote URL when the download fails", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const out = await resolvePosterFileUrl("https://example.com/x.jpg", "image", true);

    expect(out).toBe("https://example.com/x.jpg");
  });
});
