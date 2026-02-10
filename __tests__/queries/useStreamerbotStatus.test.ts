/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockApiGet = jest.fn();

jest.mock("@/lib/utils/ClientFetch", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
}));

jest.mock("@/lib/utils/websocket", () => ({
  getBackendUrl: () => "http://localhost:3002",
}));

import { useStreamerbotStatus } from "@/lib/queries/useStreamerbotStatus";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useStreamerbotStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns undefined status while loading", () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useStreamerbotStatus(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBeUndefined();
    expect(result.current.lastEventTime).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("fetches from http://localhost:3002/api/streamerbot-chat/status", async () => {
    mockApiGet.mockResolvedValue({
      status: "connected",
      lastEventTime: undefined,
    });

    const { result } = renderHook(() => useStreamerbotStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiGet).toHaveBeenCalledWith(
      "http://localhost:3002/api/streamerbot-chat/status"
    );
    expect(result.current.status).toBe("connected");
  });

  it("converts lastEventTime timestamp to ISO string", async () => {
    const timestamp = 1704067200000; // 2024-01-01T00:00:00.000Z
    mockApiGet.mockResolvedValue({
      status: "connected",
      lastEventTime: timestamp,
    });

    const { result } = renderHook(() => useStreamerbotStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.lastEventTime).toBe(
      new Date(timestamp).toISOString()
    );
  });

  it("returns null lastEventTime when timestamp is not provided", async () => {
    mockApiGet.mockResolvedValue({
      status: "disconnected",
    });

    const { result } = renderHook(() => useStreamerbotStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.lastEventTime).toBeNull();
  });

  it("returns error message from response when available", async () => {
    mockApiGet.mockResolvedValue({
      status: "error",
      error: { message: "Connection refused" },
    });

    const { result } = renderHook(() => useStreamerbotStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Connection refused");
  });

  it("returns null error when no error in response", async () => {
    mockApiGet.mockResolvedValue({
      status: "connected",
    });

    const { result } = renderHook(() => useStreamerbotStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
  });
});
