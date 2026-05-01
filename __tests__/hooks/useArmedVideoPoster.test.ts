/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";

// Stable CLIENT_ID for ownership comparisons.
jest.mock("@/lib/utils/clientId", () => ({
  CLIENT_ID: "me-1111",
}));

// Avoid network calls; we only verify the request shape.
jest.mock("@/lib/utils/ClientFetch", () => ({
  apiPost: jest.fn(() => Promise.resolve({})),
}));

// The sync hook spins up a WebSocket — stub it so tests stay deterministic.
jest.mock("@/hooks/useWebSocketChannel", () => ({
  useWebSocketChannel: jest.fn(),
}));

import { apiPost } from "@/lib/utils/ClientFetch";
import {
  useArmedVideoPoster,
  __resetArmedVideoPosterStoreForTests,
} from "@/hooks/useArmedVideoPoster";

const mockedApiPost = apiPost as jest.MockedFunction<typeof apiPost>;

const STORAGE_KEY = "ols.armedVideoPoster";

const VIDEO_INPUT = {
  posterId: "p1",
  fileUrl: "/clip.mp4",
  type: "video" as const,
  startTime: 5,
  endTime: 30,
  endBehavior: "stop" as const,
  source: "src",
  duration: 60,
};

describe("useArmedVideoPoster", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedApiPost.mockClear();
    __resetArmedVideoPosterStoreForTests();
  });

  it("starts with no armed poster", () => {
    const { result } = renderHook(() => useArmedVideoPoster());
    expect(result.current.armed).toBeNull();
  });

  it("arm() shapes the state and seeds currentTime from startTime", () => {
    const { result } = renderHook(() => useArmedVideoPoster());
    act(() => {
      result.current.arm(VIDEO_INPUT, "left");
    });
    expect(result.current.armed).toMatchObject({
      posterId: "p1",
      fileUrl: "/clip.mp4",
      type: "video",
      displayMode: "left",
      isLive: false,
      currentTime: 5, // seeded from startTime
      isPlaying: false,
      duration: 60,
    });
  });

  it("seek() and setPlaying() update store but do NOT call OBS while staging", () => {
    const { result } = renderHook(() => useArmedVideoPoster());
    act(() => {
      result.current.arm(VIDEO_INPUT, "left");
    });
    act(() => {
      result.current.seek(20);
      result.current.setPlaying(true);
    });
    expect(result.current.armed?.currentTime).toBe(20);
    expect(result.current.armed?.isPlaying).toBe(true);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it("goLive() POSTs SHOW with current cue state and flips isLive", async () => {
    const { result } = renderHook(() => useArmedVideoPoster());
    act(() => {
      result.current.arm(VIDEO_INPUT, "right");
    });
    act(() => {
      result.current.seek(15);
      result.current.setPlaying(true);
    });
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.goLive();
    });
    expect(ok).toBe(true);
    expect(mockedApiPost).toHaveBeenCalledWith(
      "/api/overlays/poster",
      expect.objectContaining({
        action: "show",
        payload: expect.objectContaining({
          posterId: "p1",
          side: "right",
          resumeFrom: 15,
          resumePlaying: true,
          ownerClientId: "me-1111",
        }),
      })
    );
    expect(result.current.armed?.isLive).toBe(true);
    expect(result.current.armed?.ownerClientId).toBe("me-1111");
  });

  it("seek/setPlaying/setMuted post to OBS when armed.isLive", async () => {
    const { result } = renderHook(() => useArmedVideoPoster());
    act(() => {
      result.current.arm(VIDEO_INPUT, "left");
    });
    await act(async () => {
      await result.current.goLive();
    });
    mockedApiPost.mockClear();

    act(() => {
      result.current.seek(42);
    });
    expect(mockedApiPost).toHaveBeenCalledWith(
      "/api/overlays/poster",
      expect.objectContaining({ action: "seek", payload: { time: 42 } })
    );

    act(() => {
      result.current.setPlaying(false);
    });
    expect(mockedApiPost).toHaveBeenCalledWith(
      "/api/overlays/poster",
      expect.objectContaining({ action: "pause" })
    );

    act(() => {
      result.current.setMuted(false);
    });
    expect(mockedApiPost).toHaveBeenCalledWith(
      "/api/overlays/poster",
      expect.objectContaining({ action: "unmute" })
    );
  });

  it("uses /poster-bigpicture endpoint and omits side for bigpicture mode", async () => {
    const { result } = renderHook(() => useArmedVideoPoster());
    act(() => {
      result.current.arm(VIDEO_INPUT, "bigpicture");
    });
    await act(async () => {
      await result.current.goLive();
    });
    expect(mockedApiPost).toHaveBeenCalledWith(
      "/api/overlays/poster-bigpicture",
      expect.objectContaining({
        payload: expect.not.objectContaining({ side: expect.anything() }),
      })
    );
  });

  it("clearArmed() removes state and localStorage", () => {
    const { result } = renderHook(() => useArmedVideoPoster());
    act(() => {
      result.current.arm(VIDEO_INPUT, "left");
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    act(() => {
      result.current.clearArmed();
    });
    expect(result.current.armed).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("persists to localStorage while staging only", async () => {
    const { result } = renderHook(() => useArmedVideoPoster());
    act(() => {
      result.current.arm(VIDEO_INPUT, "left");
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    await act(async () => {
      await result.current.goLive();
    });
    // After goLive, the persisted entry is dropped (OBS show-replay rehydrates on reload).
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("goLive() while not armed is a no-op and returns false", async () => {
    const { result } = renderHook(() => useArmedVideoPoster());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.goLive();
    });
    expect(ok).toBe(false);
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it("reportTime() is ignored once isLive (OBS is authoritative)", async () => {
    const { result } = renderHook(() => useArmedVideoPoster());
    act(() => {
      result.current.arm(VIDEO_INPUT, "left");
    });
    await act(async () => {
      await result.current.goLive();
    });
    const before = result.current.armed?.currentTime;
    act(() => {
      result.current.reportTime(99);
    });
    // currentTime should NOT change from a player report while live.
    expect(result.current.armed?.currentTime).toBe(before);
  });
});
