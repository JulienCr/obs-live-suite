/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiPatch = jest.fn();
const mockApiDelete = jest.fn();

jest.mock("@/lib/utils/ClientFetch", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPatch: (...args: unknown[]) => mockApiPatch(...args),
  apiDelete: (...args: unknown[]) => mockApiDelete(...args),
}));

import { useGuests } from "@/lib/queries/useGuests";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockGuest = {
  id: "guest-1",
  displayName: "John Doe",
  subtitle: "Developer",
  accentColor: "#ff0000",
  avatarUrl: null,
  chatMessage: null,
  isEnabled: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("useGuests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array while loading", () => {
    mockApiGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useGuests(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.guests).toEqual([]);
  });

  it("fetches from /api/assets/guests", async () => {
    mockApiGet.mockResolvedValue({ guests: [mockGuest] });

    const { result } = renderHook(() => useGuests(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiGet).toHaveBeenCalledWith("/api/assets/guests");
    expect(result.current.guests).toEqual([mockGuest]);
  });

  it("fetches with enabled filter when option is provided", async () => {
    mockApiGet.mockResolvedValue({ guests: [mockGuest] });

    const { result } = renderHook(() => useGuests({ enabled: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiGet).toHaveBeenCalledWith("/api/assets/guests?enabled=true");
  });

  it("toggleEnabled calls PATCH on correct endpoint", async () => {
    mockApiGet.mockResolvedValue({ guests: [mockGuest] });
    mockApiPatch.mockResolvedValue({ guest: { ...mockGuest, isEnabled: false } });

    const { result } = renderHook(() => useGuests(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.toggleEnabled({ id: "guest-1", isEnabled: false });

    await waitFor(() =>
      expect(mockApiPatch).toHaveBeenCalledWith("/api/assets/guests/guest-1", {
        isEnabled: false,
      })
    );
  });

  it("createGuest calls POST on correct endpoint", async () => {
    mockApiGet.mockResolvedValue({ guests: [] });
    mockApiPost.mockResolvedValue({ guest: mockGuest });

    const { result } = renderHook(() => useGuests(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const input = { displayName: "John Doe", accentColor: "#ff0000" };
    result.current.createGuest(input);

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith("/api/assets/guests", input)
    );
  });

  it("updateGuest calls PATCH on correct endpoint", async () => {
    mockApiGet.mockResolvedValue({ guests: [mockGuest] });
    mockApiPatch.mockResolvedValue({
      guest: { ...mockGuest, displayName: "Jane Doe" },
    });

    const { result } = renderHook(() => useGuests(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.updateGuest({ id: "guest-1", displayName: "Jane Doe" });

    await waitFor(() =>
      expect(mockApiPatch).toHaveBeenCalledWith("/api/assets/guests/guest-1", {
        displayName: "Jane Doe",
      })
    );
  });

  it("deleteGuest calls DELETE on correct endpoint", async () => {
    mockApiGet.mockResolvedValue({ guests: [mockGuest] });
    mockApiDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useGuests(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.deleteGuest("guest-1");

    await waitFor(() =>
      expect(mockApiDelete).toHaveBeenCalledWith("/api/assets/guests/guest-1")
    );
  });

  it("invalidates cache after successful mutation", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );

    mockApiGet.mockResolvedValue({ guests: [mockGuest] });

    const { result } = renderHook(() => useGuests(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Reset call count after initial fetch
    mockApiGet.mockClear();
    mockApiGet.mockResolvedValue({ guests: [] });
    mockApiDelete.mockResolvedValue({ success: true });

    result.current.deleteGuest("guest-1");

    // After mutation succeeds, cache should be invalidated causing a refetch
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
  });
});
