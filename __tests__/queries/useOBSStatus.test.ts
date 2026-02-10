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

import { useOBSStatus } from "@/lib/queries/useOBSStatus";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useOBSStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns DEFAULT_STATUS values while loading", () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useOBSStatus(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isOnAir).toBe(false);
    expect(result.current.currentScene).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isVirtualCamActive).toBe(false);
    expect(result.current.fps).toBe(0);
  });

  it("fetches from /api/obs/status", async () => {
    const mockStatus = {
      connected: true,
      currentScene: "Main Scene",
      isStreaming: false,
      isRecording: false,
    };
    mockApiGet.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useOBSStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiGet).toHaveBeenCalledWith("/api/obs/status");
    expect(result.current.data).toEqual(mockStatus);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.currentScene).toBe("Main Scene");
  });

  it("computes isOnAir as true when isStreaming is true", async () => {
    mockApiGet.mockResolvedValue({
      connected: true,
      currentScene: "Live",
      isStreaming: true,
      isRecording: false,
    });

    const { result } = renderHook(() => useOBSStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isOnAir).toBe(true);
  });

  it("computes isOnAir as true when isRecording is true", async () => {
    mockApiGet.mockResolvedValue({
      connected: true,
      currentScene: "Recording",
      isStreaming: false,
      isRecording: true,
    });

    const { result } = renderHook(() => useOBSStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isOnAir).toBe(true);
  });

  it("computes isOnAir as false when neither streaming nor recording", async () => {
    mockApiGet.mockResolvedValue({
      connected: true,
      currentScene: "Idle",
      isStreaming: false,
      isRecording: false,
    });

    const { result } = renderHook(() => useOBSStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isOnAir).toBe(false);
  });

  it("returns isConnected from status.connected", async () => {
    mockApiGet.mockResolvedValue({
      connected: false,
      currentScene: null,
      isStreaming: false,
      isRecording: false,
    });

    const { result } = renderHook(() => useOBSStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isConnected).toBe(false);
  });

  it("does not fetch when enabled is false", async () => {
    const { result } = renderHook(() => useOBSStatus({ enabled: false }), {
      wrapper: createWrapper(),
    });

    // With enabled=false, query is in pending status but idle fetch status,
    // so isLoading is false in React Query v5. The key assertion is no fetch.
    expect(result.current.data).toBeUndefined();
    expect(result.current.isConnected).toBe(false);
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("defaults isVirtualCamActive to false when not provided", async () => {
    mockApiGet.mockResolvedValue({
      connected: true,
      currentScene: "Main",
      isStreaming: false,
      isRecording: false,
      // isVirtualCamActive not set
    });

    const { result } = renderHook(() => useOBSStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isVirtualCamActive).toBe(false);
  });

  it("returns isVirtualCamActive when provided", async () => {
    mockApiGet.mockResolvedValue({
      connected: true,
      currentScene: "Main",
      isStreaming: false,
      isRecording: false,
      isVirtualCamActive: true,
    });

    const { result } = renderHook(() => useOBSStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isVirtualCamActive).toBe(true);
  });

  it("defaults fps to 0 when not provided", async () => {
    mockApiGet.mockResolvedValue({
      connected: true,
      currentScene: "Main",
      isStreaming: false,
      isRecording: false,
      // fps not set
    });

    const { result } = renderHook(() => useOBSStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.fps).toBe(0);
  });

  it("returns fps when provided", async () => {
    mockApiGet.mockResolvedValue({
      connected: true,
      currentScene: "Main",
      isStreaming: true,
      isRecording: false,
      fps: 60,
    });

    const { result } = renderHook(() => useOBSStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.fps).toBe(60);
  });
});
