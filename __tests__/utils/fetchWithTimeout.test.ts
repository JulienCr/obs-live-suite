import {
  TimeoutError,
  fetchWithTimeout,
  FetchWithTimeoutOptions,
} from "@/lib/utils/fetchWithTimeout";

describe("fetchWithTimeout", () => {
  // Store original fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("TimeoutError class", () => {
    it("has correct name property", () => {
      const error = new TimeoutError(5000);
      expect(error.name).toBe("TimeoutError");
    });

    it("has correct timeout property", () => {
      const error = new TimeoutError(5000);
      expect(error.timeout).toBe(5000);
    });

    it("has correct message", () => {
      const error = new TimeoutError(5000);
      expect(error.message).toBe("Request timed out after 5000ms");
    });

    it("is an instance of Error", () => {
      const error = new TimeoutError(5000);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("successful fetch", () => {
    it("returns response for successful fetch", async () => {
      const mockResponse = new Response(JSON.stringify({ data: "test" }), {
        status: 200,
      });

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const responsePromise = fetchWithTimeout("https://example.com/api");

      // Advance timers but not past timeout
      await jest.advanceTimersByTimeAsync(100);

      const response = await responsePromise;

      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/api",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("clears timeout on success", async () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      const mockResponse = new Response("OK");

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await fetchWithTimeout("https://example.com/api");

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("timeout behavior", () => {
    it("throws TimeoutError when request times out", async () => {
      // Create a fetch that never resolves until aborted
      global.fetch = jest.fn().mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () => {
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      const fetchPromise = fetchWithTimeout("https://example.com/api", {
        timeout: 5000,
      });

      // Advance past the timeout
      jest.advanceTimersByTime(5001);

      await expect(fetchPromise).rejects.toBeInstanceOf(TimeoutError);
    });

    it("includes timeout value in TimeoutError", async () => {
      global.fetch = jest.fn().mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () => {
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      const fetchPromise = fetchWithTimeout("https://example.com/api", {
        timeout: 5000,
      });

      jest.advanceTimersByTime(5001);

      await expect(fetchPromise).rejects.toMatchObject({
        timeout: 5000,
        message: "Request timed out after 5000ms",
      });
    });

    it("uses default timeout of 30000ms", async () => {
      global.fetch = jest.fn().mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () => {
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      const fetchPromise = fetchWithTimeout("https://example.com/api");

      // Advance past the default timeout
      jest.advanceTimersByTime(30001);

      await expect(fetchPromise).rejects.toMatchObject({
        timeout: 30000,
      });
    });

    it("respects custom timeout option", async () => {
      global.fetch = jest.fn().mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () => {
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      const fetchPromise = fetchWithTimeout("https://example.com/api", {
        timeout: 1000,
      });

      // Advance past custom timeout
      jest.advanceTimersByTime(1001);

      await expect(fetchPromise).rejects.toMatchObject({
        timeout: 1000,
      });
    });

    it("clears timeout on error", async () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      const networkError = new Error("Network error");

      global.fetch = jest.fn().mockRejectedValue(networkError);

      await expect(
        fetchWithTimeout("https://example.com/api")
      ).rejects.toThrow("Network error");

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("fetch options passthrough", () => {
    it("passes through method option", async () => {
      const mockResponse = new Response("OK");
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await fetchWithTimeout("https://example.com/api", {
        method: "POST",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/api",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("passes through headers option", async () => {
      const mockResponse = new Response("OK");
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await fetchWithTimeout("https://example.com/api", {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/api",
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer token123",
          },
        })
      );
    });

    it("passes through body option", async () => {
      const mockResponse = new Response("OK");
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const body = JSON.stringify({ key: "value" });

      await fetchWithTimeout("https://example.com/api", {
        method: "POST",
        body,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/api",
        expect.objectContaining({
          method: "POST",
          body,
        })
      );
    });

    it("passes through multiple fetch options", async () => {
      const mockResponse = new Response("OK");
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const options: FetchWithTimeoutOptions = {
        method: "PUT",
        headers: { "X-Custom-Header": "value" },
        body: "test body",
        credentials: "include",
        mode: "cors",
        timeout: 5000,
      };

      await fetchWithTimeout("https://example.com/api", options);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/api",
        expect.objectContaining({
          method: "PUT",
          headers: { "X-Custom-Header": "value" },
          body: "test body",
          credentials: "include",
          mode: "cors",
        })
      );

      // Timeout should not be passed to fetch
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });
  });

  describe("external abort signal handling", () => {
    it("handles external abort signal", async () => {
      const externalController = new AbortController();

      global.fetch = jest.fn().mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () => {
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      const fetchPromise = fetchWithTimeout("https://example.com/api", {
        signal: externalController.signal,
        timeout: 30000,
      });

      // Abort externally (not via timeout)
      externalController.abort();

      // Should throw regular AbortError, not TimeoutError
      await expect(fetchPromise).rejects.toMatchObject({
        name: "AbortError",
      });
    });

    it("does not throw TimeoutError for external abort", async () => {
      const externalController = new AbortController();

      global.fetch = jest.fn().mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((_, reject) => {
            options.signal?.addEventListener("abort", () => {
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      );

      const fetchPromise = fetchWithTimeout("https://example.com/api", {
        signal: externalController.signal,
        timeout: 30000,
      });

      // Abort externally (not via timeout)
      externalController.abort();

      // Verify it's not a TimeoutError
      let caughtError: Error | null = null;
      try {
        await fetchPromise;
      } catch (error) {
        caughtError = error as Error;
      }

      expect(caughtError).not.toBeInstanceOf(TimeoutError);
    });

    it("removes abort listener after completion", async () => {
      const externalController = new AbortController();
      const removeEventListenerSpy = jest.spyOn(
        externalController.signal,
        "removeEventListener"
      );

      const mockResponse = new Response("OK");
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await fetchWithTimeout("https://example.com/api", {
        signal: externalController.signal,
      });

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "abort",
        expect.any(Function)
      );
    });
  });

  describe("error handling", () => {
    it("rethrows non-abort errors", async () => {
      const networkError = new Error("Network failure");
      global.fetch = jest.fn().mockRejectedValue(networkError);

      await expect(
        fetchWithTimeout("https://example.com/api")
      ).rejects.toThrow("Network failure");
    });

    it("handles URL object as input", async () => {
      const mockResponse = new Response("OK");
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const url = new URL("https://example.com/api");
      const response = await fetchWithTimeout(url);

      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(url, expect.any(Object));
    });
  });
});
