import {
  isValidUrl,
  isYouTubeUrl,
  extractYouTubeId,
  isDirectMediaUrl,
  getMediaTypeFromUrl,
  getFilenameFromUrl,
} from "@/lib/utils/urlDetection";

describe("isValidUrl", () => {
  it("accepts http URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("accepts https URLs", () => {
    expect(isValidUrl("https://example.com/path")).toBe(true);
  });

  it("accepts URLs without protocol by auto-prefixing https", () => {
    expect(isValidUrl("example.com")).toBe(true);
  });

  it("rejects invalid strings", () => {
    expect(isValidUrl("not a url at all")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });
});

describe("isYouTubeUrl", () => {
  it("detects youtube.com URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
  });

  it("detects youtu.be URLs", () => {
    expect(isYouTubeUrl("https://youtu.be/abc123")).toBe(true);
  });

  it("returns false for non-YouTube URLs", () => {
    expect(isYouTubeUrl("https://vimeo.com/12345")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isYouTubeUrl("")).toBe(false);
  });

  it("returns false for null-like values", () => {
    expect(isYouTubeUrl(null as unknown as string)).toBe(false);
    expect(isYouTubeUrl(undefined as unknown as string)).toBe(false);
  });
});

describe("extractYouTubeId", () => {
  it("extracts ID from watch?v= format", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts ID from youtu.be format", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts ID from /embed/ format", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ");
  });

  it("returns null for bare 11-char ID (parsed as hostname with https prefix)", () => {
    // "dQw4w9WgXcQ" becomes a valid URL as "https://dQw4w9WgXcQ",
    // so the bare ID regex fallback is never reached
    expect(extractYouTubeId("dQw4w9WgXcQ")).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(extractYouTubeId("not-a-video")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractYouTubeId("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(extractYouTubeId(null as unknown as string)).toBeNull();
  });
});

describe("isDirectMediaUrl", () => {
  it("returns true for .mp4 URLs", () => {
    expect(isDirectMediaUrl("https://example.com/video.mp4")).toBe(true);
  });

  it("returns true for .jpg URLs", () => {
    expect(isDirectMediaUrl("https://example.com/photo.jpg")).toBe(true);
  });

  it("returns true for .png URLs", () => {
    expect(isDirectMediaUrl("https://example.com/image.png")).toBe(true);
  });

  it("returns true for media URLs with query params", () => {
    expect(isDirectMediaUrl("https://example.com/image.webp?w=800")).toBe(true);
  });

  it("returns false for .html URLs", () => {
    expect(isDirectMediaUrl("https://example.com/page.html")).toBe(false);
  });

  it("returns false for non-media URLs", () => {
    expect(isDirectMediaUrl("https://example.com/page")).toBe(false);
  });

  it("returns false for empty/null inputs", () => {
    expect(isDirectMediaUrl("")).toBe(false);
    expect(isDirectMediaUrl(null as unknown as string)).toBe(false);
  });
});

describe("getMediaTypeFromUrl", () => {
  it.each([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"])(
    'returns "image" for %s extension',
    (ext) => {
      expect(getMediaTypeFromUrl(`https://example.com/file${ext}`)).toBe(
        "image"
      );
    }
  );

  it.each([".mp4", ".webm", ".mov"])(
    'returns "video" for %s extension',
    (ext) => {
      expect(getMediaTypeFromUrl(`https://example.com/file${ext}`)).toBe(
        "video"
      );
    }
  );

  it("returns null for non-media URLs", () => {
    expect(getMediaTypeFromUrl("https://example.com/page.html")).toBeNull();
  });

  it("returns null for empty/null inputs", () => {
    expect(getMediaTypeFromUrl("")).toBeNull();
    expect(getMediaTypeFromUrl(null as unknown as string)).toBeNull();
  });
});

describe("getFilenameFromUrl", () => {
  it("extracts filename without extension", () => {
    expect(getFilenameFromUrl("https://example.com/photo.jpg")).toBe("photo");
  });

  it("decodes URI components", () => {
    expect(getFilenameFromUrl("https://example.com/my%20photo.jpg")).toBe(
      "my photo"
    );
  });

  it('returns "Untitled" for empty input', () => {
    expect(getFilenameFromUrl("")).toBe("Untitled");
  });

  it('returns "Untitled" for root path', () => {
    expect(getFilenameFromUrl("https://example.com/")).toBe("Untitled");
  });
});
