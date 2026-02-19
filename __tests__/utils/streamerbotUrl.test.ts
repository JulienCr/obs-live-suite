import {
  buildStreamerbotUrl,
  parseStreamerbotUrl,
} from "@/lib/utils/streamerbotUrl";

describe("streamerbotUrl", () => {
  describe("buildStreamerbotUrl", () => {
    it("should build URL with all parts", () => {
      expect(
        buildStreamerbotUrl({
          host: "192.168.1.10",
          port: 9090,
          endpoint: "/ws",
          scheme: "wss",
        })
      ).toBe("wss://192.168.1.10:9090/ws");
    });

    it("should use defaults for missing parts", () => {
      expect(buildStreamerbotUrl({})).toBe("ws://127.0.0.1:8080/");
    });

    it("should use defaults for partial parts", () => {
      expect(buildStreamerbotUrl({ host: "myhost" })).toBe(
        "ws://myhost:8080/"
      );
    });

    it("should handle wss scheme", () => {
      expect(
        buildStreamerbotUrl({ scheme: "wss", host: "secure.host", port: 443 })
      ).toBe("wss://secure.host:443/");
    });
  });

  describe("parseStreamerbotUrl", () => {
    it("should parse ws:// URL", () => {
      expect(parseStreamerbotUrl("ws://192.168.1.10:9090/ws")).toEqual({
        host: "192.168.1.10",
        port: 9090,
        endpoint: "/ws",
        scheme: "ws",
      });
    });

    it("should parse wss:// URL", () => {
      expect(parseStreamerbotUrl("wss://secure.host:443/")).toEqual({
        host: "secure.host",
        port: 443,
        endpoint: "/",
        scheme: "wss",
      });
    });

    it("should return defaults for empty string", () => {
      expect(parseStreamerbotUrl("")).toEqual({
        host: "127.0.0.1",
        port: 8080,
        endpoint: "/",
        scheme: "ws",
      });
    });

    it("should return defaults for invalid URL", () => {
      expect(parseStreamerbotUrl("not a valid url:::")).toEqual({
        host: "127.0.0.1",
        port: 8080,
        endpoint: "/",
        scheme: "ws",
      });
    });

    it("should default port to 8080 when not specified", () => {
      const result = parseStreamerbotUrl("ws://myhost/");
      expect(result.host).toBe("myhost");
      expect(result.port).toBe(8080);
    });

    it("should handle URL without scheme as ws://", () => {
      const result = parseStreamerbotUrl("127.0.0.1:8080/");
      expect(result.scheme).toBe("ws");
      expect(result.host).toBe("127.0.0.1");
      expect(result.port).toBe(8080);
    });

    it("should trim whitespace", () => {
      expect(parseStreamerbotUrl("  ws://127.0.0.1:8080/  ")).toEqual({
        host: "127.0.0.1",
        port: 8080,
        endpoint: "/",
        scheme: "ws",
      });
    });
  });

  describe("round-trip", () => {
    it("should round-trip default URL", () => {
      const url = "ws://127.0.0.1:8080/";
      expect(buildStreamerbotUrl(parseStreamerbotUrl(url))).toBe(url);
    });

    it("should round-trip custom URL", () => {
      const url = "wss://192.168.1.50:9090/custom";
      expect(buildStreamerbotUrl(parseStreamerbotUrl(url))).toBe(url);
    });

    it("should round-trip from parts", () => {
      const parts = {
        host: "myserver",
        port: 7777,
        endpoint: "/api",
        scheme: "ws" as const,
      };
      expect(parseStreamerbotUrl(buildStreamerbotUrl(parts))).toEqual(parts);
    });
  });
});
