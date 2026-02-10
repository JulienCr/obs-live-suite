/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock("@/lib/utils/ClientFetch", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
}));

import { useProfiles } from "@/lib/queries/useProfiles";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockProfiles = [
  {
    id: "profile-1",
    name: "Default Profile",
    description: null,
    themeId: "theme-1",
    dskSourceName: "DSK",
    defaultScene: null,
    posterRotation: [],
    audioSettings: {
      countdownCueEnabled: false,
      countdownCueAt: 10,
      actionSoundsEnabled: true,
    },
    isActive: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "profile-2",
    name: "Live Profile",
    description: "For live shows",
    themeId: "theme-2",
    dskSourceName: "DSK",
    defaultScene: "Main Scene",
    posterRotation: [],
    audioSettings: {
      countdownCueEnabled: true,
      countdownCueAt: 5,
      actionSoundsEnabled: true,
    },
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

describe("useProfiles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array while loading", () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useProfiles(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.profiles).toEqual([]);
    expect(result.current.activeProfile).toBeUndefined();
  });

  it("fetches from /api/profiles", async () => {
    mockApiGet.mockResolvedValue({ profiles: mockProfiles });

    const { result } = renderHook(() => useProfiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiGet).toHaveBeenCalledWith("/api/profiles");
    expect(result.current.profiles).toEqual(mockProfiles);
  });

  it("computes activeProfile from profiles with isActive=true", async () => {
    mockApiGet.mockResolvedValue({ profiles: mockProfiles });

    const { result } = renderHook(() => useProfiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeProfile).toEqual(mockProfiles[1]);
    expect(result.current.activeProfile?.id).toBe("profile-2");
    expect(result.current.activeProfile?.isActive).toBe(true);
  });

  it("returns undefined activeProfile when no profile is active", async () => {
    const inactiveProfiles = mockProfiles.map((p) => ({
      ...p,
      isActive: false,
    }));
    mockApiGet.mockResolvedValue({ profiles: inactiveProfiles });

    const { result } = renderHook(() => useProfiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeProfile).toBeUndefined();
  });

  it("activateProfile mutation calls POST on /api/profiles/{id}/activate", async () => {
    mockApiGet.mockResolvedValue({ profiles: mockProfiles });
    mockApiPost.mockResolvedValue({
      profile: { ...mockProfiles[0], isActive: true },
    });

    const { result } = renderHook(() => useProfiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.activateProfile("profile-1");

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith(
        "/api/profiles/profile-1/activate"
      )
    );
  });

  it("invalidates cache after activateProfile mutation succeeds", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );

    mockApiGet.mockResolvedValue({ profiles: mockProfiles });

    const { result } = renderHook(() => useProfiles(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Reset and set up for refetch
    mockApiGet.mockClear();
    mockApiGet.mockResolvedValue({
      profiles: mockProfiles.map((p) => ({
        ...p,
        isActive: p.id === "profile-1",
      })),
    });
    mockApiPost.mockResolvedValue({
      profile: { ...mockProfiles[0], isActive: true },
    });

    result.current.activateProfile("profile-1");

    // After mutation succeeds, cache should be invalidated causing a refetch
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
  });
});
