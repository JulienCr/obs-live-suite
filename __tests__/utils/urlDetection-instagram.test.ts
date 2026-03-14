import { isInstagramUrl, getInstagramUrlType, extractInstagramUsername, extractInstagramShortcode } from "@/lib/utils/urlDetection";

describe("isInstagramUrl", () => {
  it("detects instagram.com URLs", () => {
    expect(isInstagramUrl("https://www.instagram.com/p/ABC123/")).toBe(true);
    expect(isInstagramUrl("https://instagram.com/reel/ABC123/")).toBe(true);
    expect(isInstagramUrl("https://www.instagram.com/testaccount")).toBe(true);
    expect(isInstagramUrl("instagram.com/p/ABC123")).toBe(true);
  });

  it("rejects non-Instagram URLs", () => {
    expect(isInstagramUrl("https://youtube.com/watch?v=123")).toBe(false);
    expect(isInstagramUrl("https://facebook.com/page")).toBe(false);
    expect(isInstagramUrl("")).toBe(false);
    expect(isInstagramUrl("not a url")).toBe(false);
  });
});

describe("getInstagramUrlType", () => {
  it("detects post URLs", () => {
    expect(getInstagramUrlType("https://www.instagram.com/p/ABC123/")).toBe("post");
    expect(getInstagramUrlType("https://instagram.com/p/ABC123")).toBe("post");
  });

  it("detects reel URLs", () => {
    expect(getInstagramUrlType("https://www.instagram.com/reel/ABC123/")).toBe("reel");
    expect(getInstagramUrlType("https://instagram.com/reel/ABC123")).toBe("reel");
  });

  it("detects profile URLs", () => {
    expect(getInstagramUrlType("https://www.instagram.com/testaccount")).toBe("profile");
    expect(getInstagramUrlType("https://instagram.com/testaccount/")).toBe("profile");
  });

  it("returns null for system paths", () => {
    expect(getInstagramUrlType("https://instagram.com/explore/")).toBe(null);
    expect(getInstagramUrlType("https://instagram.com/accounts/login")).toBe(null);
  });

  it("returns null for non-Instagram URLs", () => {
    expect(getInstagramUrlType("https://youtube.com")).toBe(null);
    expect(getInstagramUrlType("")).toBe(null);
  });
});

describe("extractInstagramUsername", () => {
  it("extracts from profile URLs", () => {
    expect(extractInstagramUsername("https://www.instagram.com/testaccount")).toBe("testaccount");
    expect(extractInstagramUsername("https://instagram.com/testaccount/")).toBe("testaccount");
    expect(extractInstagramUsername("instagram.com/testaccount")).toBe("testaccount");
  });

  it("returns raw username if valid", () => {
    expect(extractInstagramUsername("testaccount")).toBe("testaccount");
    expect(extractInstagramUsername("user.name_123")).toBe("user.name_123");
  });

  it("returns null for post/reel URLs", () => {
    expect(extractInstagramUsername("https://instagram.com/p/ABC123")).toBe(null);
    expect(extractInstagramUsername("https://instagram.com/reel/ABC123")).toBe(null);
  });

  it("returns null for invalid input", () => {
    expect(extractInstagramUsername("")).toBe(null);
    expect(extractInstagramUsername("has spaces")).toBe(null);
  });
});

describe("extractInstagramShortcode", () => {
  it("extracts from post URLs", () => {
    expect(extractInstagramShortcode("https://www.instagram.com/p/ABC123/")).toBe("ABC123");
    expect(extractInstagramShortcode("https://instagram.com/p/XYZ789")).toBe("XYZ789");
  });

  it("extracts from reel URLs", () => {
    expect(extractInstagramShortcode("https://www.instagram.com/reel/DEF456/")).toBe("DEF456");
  });

  it("returns null for profile URLs", () => {
    expect(extractInstagramShortcode("https://instagram.com/john_doe")).toBe(null);
  });

  it("returns null for non-Instagram URLs", () => {
    expect(extractInstagramShortcode("https://youtube.com/watch?v=123")).toBe(null);
    expect(extractInstagramShortcode("")).toBe(null);
  });
});
