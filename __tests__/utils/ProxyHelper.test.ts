import { NextResponse } from "next/server";
import {
  proxyToBackend,
  createGetProxy,
  createPostProxy,
} from "@/lib/utils/ProxyHelper";

// Mock NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}));

// Mock BACKEND_URL
jest.mock("@/lib/config/urls", () => ({
  BACKEND_URL: "http://localhost:3002",
}));

describe("ProxyHelper", () => {
  const originalFetch = global.fetch;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    consoleErrorSpy.mockRestore();
  });

  describe("proxyToBackend", () => {
    describe("HTTP methods", () => {
      it("makes GET request by default", async () => {
        const mockResponse = new Response(JSON.stringify({ data: "test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        await proxyToBackend("/api/test");

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3002/api/test",
          expect.objectContaining({
            method: "GET",
          })
        );
      });

      it("makes POST request when method is POST", async () => {
        const mockResponse = new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        await proxyToBackend("/api/test", { method: "POST" });

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3002/api/test",
          expect.objectContaining({
            method: "POST",
          })
        );
      });

      it("makes PUT request when method is PUT", async () => {
        const mockResponse = new Response(JSON.stringify({ updated: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        await proxyToBackend("/api/test", { method: "PUT" });

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3002/api/test",
          expect.objectContaining({
            method: "PUT",
          })
        );
      });

      it("makes DELETE request when method is DELETE", async () => {
        const mockResponse = new Response(JSON.stringify({ deleted: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        await proxyToBackend("/api/test", { method: "DELETE" });

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3002/api/test",
          expect.objectContaining({
            method: "DELETE",
          })
        );
      });
    });

    describe("request body handling", () => {
      it("includes body as JSON for POST requests", async () => {
        const mockResponse = new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const body = { name: "Test", value: 123 };
        await proxyToBackend("/api/test", { method: "POST", body });

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3002/api/test",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        );
      });

      it("includes body as JSON for PUT requests", async () => {
        const mockResponse = new Response(JSON.stringify({ updated: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const body = { id: 1, name: "Updated" };
        await proxyToBackend("/api/test", { method: "PUT", body });

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3002/api/test",
          expect.objectContaining({
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        );
      });

      it("includes body as JSON for DELETE requests", async () => {
        const mockResponse = new Response(JSON.stringify({ deleted: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const body = { ids: [1, 2, 3] };
        await proxyToBackend("/api/test", { method: "DELETE", body });

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3002/api/test",
          expect.objectContaining({
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        );
      });

      it("does not include body or Content-Type header for GET requests", async () => {
        const mockResponse = new Response(JSON.stringify({ data: "test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        await proxyToBackend("/api/test", { method: "GET" });

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3002/api/test",
          {
            method: "GET",
            headers: undefined,
            body: undefined,
          }
        );
      });
    });

    describe("success responses", () => {
      it("returns NextResponse with backend data on success", async () => {
        const responseData = { id: 1, name: "Test", status: "active" };
        const mockResponse = new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const result = await proxyToBackend("/api/test");

        expect(NextResponse.json).toHaveBeenCalledWith(responseData, {
          status: 200,
        });
        expect(result).toEqual({
          body: responseData,
          status: 200,
        });
      });

      it("preserves backend status code in response", async () => {
        const responseData = { created: true };
        const mockResponse = new Response(JSON.stringify(responseData), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const result = await proxyToBackend("/api/test", { method: "POST" });

        expect(NextResponse.json).toHaveBeenCalledWith(responseData, {
          status: 201,
        });
        expect(result).toEqual({
          body: responseData,
          status: 201,
        });
      });
    });

    describe("error responses from backend", () => {
      it("returns NextResponse with error on backend error response", async () => {
        const errorData = { error: "Resource not found" };
        const mockResponse = new Response(JSON.stringify(errorData), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const result = await proxyToBackend("/api/test");

        expect(NextResponse.json).toHaveBeenCalledWith(errorData, {
          status: 404,
        });
        expect(result).toEqual({
          body: errorData,
          status: 404,
        });
      });

      it("returns NextResponse with error on 500 backend response", async () => {
        const errorData = { error: "Internal server error" };
        const mockResponse = new Response(JSON.stringify(errorData), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const result = await proxyToBackend("/api/test");

        expect(NextResponse.json).toHaveBeenCalledWith(errorData, {
          status: 500,
        });
        expect(result).toEqual({
          body: errorData,
          status: 500,
        });
      });
    });

    describe("fetch failure handling", () => {
      it("returns 503 status on fetch failure", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

        const result = await proxyToBackend("/api/test");

        expect(NextResponse.json).toHaveBeenCalledWith(
          {
            error: "Request failed: Network error",
          },
          { status: 503 }
        );
        expect(result).toEqual({
          body: {
            error: "Request failed: Network error",
          },
          status: 503,
        });
      });

      it("returns 503 status on connection refused", async () => {
        global.fetch = jest
          .fn()
          .mockRejectedValue(new Error("ECONNREFUSED"));

        const result = await proxyToBackend("/api/test");

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: "Request failed: ECONNREFUSED",
          }),
          { status: 503 }
        );
        expect(result.status).toBe(503);
      });
    });

    describe("non-JSON response handling", () => {
      it("handles non-JSON success responses as text", async () => {
        const mockResponse = new Response("OK", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const result = await proxyToBackend("/api/test");

        expect(NextResponse.json).toHaveBeenCalledWith(
          { message: "OK" },
          { status: 200 }
        );
        expect(result).toEqual({
          body: { message: "OK" },
          status: 200,
        });
      });

      it("handles non-JSON error responses as text", async () => {
        const mockResponse = new Response("Bad Request", {
          status: 400,
          headers: { "Content-Type": "text/plain" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const result = await proxyToBackend("/api/test");

        expect(NextResponse.json).toHaveBeenCalledWith(
          { error: "Bad Request" },
          { status: 400 }
        );
        expect(result).toEqual({
          body: { error: "Bad Request" },
          status: 400,
        });
      });

      it("uses custom errorMessage for empty non-JSON error response", async () => {
        const mockResponse = new Response("", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const result = await proxyToBackend("/api/test", {
          errorMessage: "Custom error message",
        });

        expect(NextResponse.json).toHaveBeenCalledWith(
          { error: "Custom error message" },
          { status: 500 }
        );
        expect(result).toEqual({
          body: { error: "Custom error message" },
          status: 500,
        });
      });
    });

    describe("logging", () => {
      it("logs with logPrefix when provided for backend errors", async () => {
        const errorData = { error: "Backend error" };
        const mockResponse = new Response(JSON.stringify(errorData), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        await proxyToBackend("/api/test", {
          logPrefix: "[Test Proxy]",
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[Test Proxy] Backend error:",
          500,
          errorData
        );
      });

      it("logs with logPrefix when provided for fetch errors", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("Connection failed"));

        await proxyToBackend("/api/test", {
          logPrefix: "[Test Proxy]",
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[Test Proxy] Proxy error:",
          expect.any(Error)
        );
      });

      it("logs with logPrefix for non-JSON error responses", async () => {
        const mockResponse = new Response("Internal Error", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        await proxyToBackend("/api/test", {
          logPrefix: "[Test Proxy]",
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[Test Proxy] Backend error:",
          500,
          "Internal Error"
        );
      });

      it("logs with default prefix when no logPrefix provided for fetch errors", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

        await proxyToBackend("/api/test", {
          errorMessage: "Custom error",
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[ProxyHelper] Custom error:",
          expect.any(Error)
        );
      });

      it("does not log on successful responses", async () => {
        const responseData = { success: true };
        const mockResponse = new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        await proxyToBackend("/api/test", {
          logPrefix: "[Test Proxy]",
        });

        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });

    describe("custom errorMessage", () => {
      it("uses custom errorMessage in fetch error response", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

        const result = await proxyToBackend("/api/test", {
          errorMessage: "Failed to update overlay",
        });

        expect(NextResponse.json).toHaveBeenCalledWith(
          {
            error: "Failed to update overlay: Network error",
          },
          { status: 503 }
        );
        expect(result.body.error).toBe("Failed to update overlay: Network error");
      });

      it("uses default errorMessage when not provided", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("Connection timeout"));

        const result = await proxyToBackend("/api/test");

        expect(result.body.error).toBe("Request failed: Connection timeout");
      });
    });

    describe("non-Error exceptions", () => {
      it("handles string exceptions", async () => {
        global.fetch = jest.fn().mockRejectedValue("String error");

        const result = await proxyToBackend("/api/test");

        expect(NextResponse.json).toHaveBeenCalledWith(
          {
            error: "Request failed: String error",
          },
          { status: 503 }
        );
      });

      it("handles object exceptions", async () => {
        global.fetch = jest.fn().mockRejectedValue({ code: "TIMEOUT" });

        const result = await proxyToBackend("/api/test");

        expect(NextResponse.json).toHaveBeenCalledWith(
          {
            error: "Request failed: [object Object]",
          },
          { status: 503 }
        );
      });
    });
  });

  describe("createGetProxy", () => {
    it("returns function that calls proxyToBackend with GET", async () => {
      const responseData = { status: "ok" };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const getHandler = createGetProxy("/api/status");
      const result = await getHandler();

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3002/api/status",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toEqual({
        body: responseData,
        status: 200,
      });
    });

    it("passes errorMessage to proxyToBackend", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Connection failed"));

      const getHandler = createGetProxy(
        "/api/status",
        "Failed to get status"
      );
      const result = await getHandler();

      expect(result.body.error).toBe("Failed to get status: Connection failed");
    });

    it("uses default errorMessage when not provided", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const getHandler = createGetProxy("/api/status");
      const result = await getHandler();

      expect(result.body.error).toBe("Request failed: Network error");
    });

    it("returns a function that can be called multiple times", async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(
          new Response(JSON.stringify({ count: callCount }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const getHandler = createGetProxy("/api/counter");

      await getHandler();
      await getHandler();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("createPostProxy", () => {
    it("returns function that accepts body and calls proxyToBackend with POST", async () => {
      const responseData = { created: true };
      const mockResponse = new Response(JSON.stringify(responseData), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const postHandler = createPostProxy("/api/items");
      const body = { name: "New Item", value: 42 };
      const result = await postHandler(body);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3002/api/items",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      );
      expect(result).toEqual({
        body: responseData,
        status: 201,
      });
    });

    it("passes body and errorMessage to proxyToBackend", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Server error"));

      const postHandler = createPostProxy(
        "/api/items",
        "Failed to create item"
      );
      const result = await postHandler({ name: "Test" });

      expect(result.body.error).toBe("Failed to create item: Server error");
    });

    it("uses default errorMessage when not provided", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const postHandler = createPostProxy("/api/items");
      const result = await postHandler({ data: "test" });

      expect(result.body.error).toBe("Request failed: Network error");
    });

    it("handles different body types", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const postHandler = createPostProxy("/api/items");

      // Test with array body
      await postHandler([1, 2, 3]);
      expect(global.fetch).toHaveBeenLastCalledWith(
        "http://localhost:3002/api/items",
        expect.objectContaining({
          body: "[1,2,3]",
        })
      );

      // Test with nested object body
      await postHandler({ nested: { deep: "value" } });
      expect(global.fetch).toHaveBeenLastCalledWith(
        "http://localhost:3002/api/items",
        expect.objectContaining({
          body: JSON.stringify({ nested: { deep: "value" } }),
        })
      );
    });

    it("handles null and undefined body values", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const postHandler = createPostProxy("/api/items");

      // Test with null body
      await postHandler(null);
      expect(global.fetch).toHaveBeenLastCalledWith(
        "http://localhost:3002/api/items",
        expect.objectContaining({
          body: "null",
        })
      );

      // Test with empty object body
      await postHandler({});
      expect(global.fetch).toHaveBeenLastCalledWith(
        "http://localhost:3002/api/items",
        expect.objectContaining({
          body: "{}",
        })
      );
    });
  });
});
