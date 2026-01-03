import { NextResponse } from "next/server";
import {
  apiError,
  expressError,
  isZodError,
  getErrorStatusCode,
} from "@/lib/utils/apiError";

// Mock NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}));

describe("apiError utility", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("apiError", () => {
    it("should return NextResponse.json with error message", () => {
      const error = new Error("Something broke");
      const result = apiError(error, "Request failed");

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Request failed" },
        { status: 500 }
      );
      expect(result).toEqual({
        body: { error: "Request failed" },
        status: 500,
      });
    });

    it("should use default status 500", () => {
      const error = new Error("Test error");
      apiError(error, "Generic error");

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Generic error" },
        { status: 500 }
      );
    });

    it("should respect custom status option", () => {
      const error = new Error("Bad input");
      apiError(error, "Invalid request", { status: 400 });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Invalid request" },
        { status: 400 }
      );
    });

    it("should log error by default", () => {
      const error = new Error("Test error");
      apiError(error, "Something went wrong");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Something went wrong:",
        expect.stringContaining("Test error")
      );
    });

    it("should not log when log: false", () => {
      const error = new Error("Silent error");
      apiError(error, "Error message", { log: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should include context prefix in log when provided", () => {
      const error = new Error("Context error");
      apiError(error, "Operation failed", { context: "[GuestsAPI]" });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[GuestsAPI] Operation failed:",
        expect.stringContaining("Context error")
      );
    });

    it("should handle Error objects", () => {
      const error = new Error("Error object message");
      error.stack = "Error: Error object message\n    at test.ts:1:1";
      apiError(error, "Handled error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Handled error:",
        expect.stringContaining("Error object message")
      );
    });

    it("should handle string errors", () => {
      apiError("string error message", "String error occurred");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "String error occurred:",
        "string error message"
      );
    });

    it("should handle unknown error types", () => {
      const unknownError = { custom: "error", value: 123 };
      apiError(unknownError, "Unknown error occurred");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Unknown error occurred:",
        JSON.stringify(unknownError)
      );
    });

    it("should handle null error", () => {
      apiError(null, "Null error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Null error:", "null");
    });

    it("should handle undefined error", () => {
      apiError(undefined, "Undefined error");

      // JSON.stringify(undefined) returns undefined, not a string
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Undefined error:",
        undefined
      );
    });
  });

  describe("expressError", () => {
    let mockRes: {
      status: jest.Mock;
      json: jest.Mock;
    };

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it("should call res.status().json() with error message", () => {
      const error = new Error("Express error");
      expressError(mockRes as never, error, "Request failed");

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Request failed" });
    });

    it("should use default status 500", () => {
      const error = new Error("Default status");
      expressError(mockRes as never, error, "Server error");

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it("should respect custom status option", () => {
      const error = new Error("Custom status");
      expressError(mockRes as never, error, "Bad request", { status: 400 });

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("should log error by default", () => {
      const error = new Error("Logged error");
      expressError(mockRes as never, error, "Error occurred");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error occurred:",
        expect.stringContaining("Logged error")
      );
    });

    it("should not log when log: false", () => {
      const error = new Error("Silent express error");
      expressError(mockRes as never, error, "Error message", { log: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should include context prefix in log when provided", () => {
      const error = new Error("Context express error");
      expressError(mockRes as never, error, "Failed", {
        context: "[OverlaysAPI]",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[OverlaysAPI] Failed:",
        expect.stringContaining("Context express error")
      );
    });
  });

  describe("isZodError", () => {
    it("should return true for ZodError-like objects", () => {
      const zodError = { name: "ZodError", issues: [] };
      expect(isZodError(zodError)).toBe(true);
    });

    it("should return true for object with only name property", () => {
      const zodLike = { name: "ZodError" };
      expect(isZodError(zodLike)).toBe(true);
    });

    it("should return false for regular Error", () => {
      const regularError = new Error("Regular error");
      expect(isZodError(regularError)).toBe(false);
    });

    it("should return false for Error with different name", () => {
      const error = new Error("Test");
      error.name = "ValidationError";
      expect(isZodError(error)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isZodError(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isZodError(undefined)).toBe(false);
    });

    it("should return false for non-objects", () => {
      expect(isZodError("ZodError")).toBe(false);
      expect(isZodError(123)).toBe(false);
      expect(isZodError(true)).toBe(false);
    });

    it("should return false for object without name property", () => {
      const noName = { message: "error", issues: [] };
      expect(isZodError(noName)).toBe(false);
    });
  });

  describe("getErrorStatusCode", () => {
    it("should return 400 for ZodError", () => {
      const zodError = { name: "ZodError", issues: [] };
      expect(getErrorStatusCode(zodError)).toBe(400);
    });

    it("should return 500 for regular Error", () => {
      const error = new Error("Server error");
      expect(getErrorStatusCode(error)).toBe(500);
    });

    it("should return 500 for string errors", () => {
      expect(getErrorStatusCode("string error")).toBe(500);
    });

    it("should return 500 for null", () => {
      expect(getErrorStatusCode(null)).toBe(500);
    });

    it("should return 500 for undefined", () => {
      expect(getErrorStatusCode(undefined)).toBe(500);
    });

    it("should return 500 for unknown object errors", () => {
      expect(getErrorStatusCode({ custom: "error" })).toBe(500);
    });
  });
});
