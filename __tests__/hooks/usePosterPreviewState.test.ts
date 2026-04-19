/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";

// Static CLIENT_ID for predictable ownership comparisons.
jest.mock("@/lib/utils/clientId", () => ({
  CLIENT_ID: "me-1111",
}));

// Neither the arbitration logic (cue vs live vs null) nor the returned shape
// depend on the WebSocket itself for these tests — we only care about how
// usePosterPreviewState composes useOverlayActiveState + useCuedPoster +
// ownership. So stub the WS hook to a no-op.
jest.mock("@/hooks/useWebSocketChannel", () => ({
  useWebSocketChannel: jest.fn(),
}));

import { useOverlayActiveState } from "@/hooks/useOverlayActiveState";
import { useCuedPoster } from "@/hooks/useCuedPoster";
import { usePosterPreviewState } from "@/hooks/usePosterPreviewState";

jest.mock("@/hooks/useOverlayActiveState", () => ({
  useOverlayActiveState: jest.fn(),
}));

jest.mock("@/hooks/useCuedPoster", () => ({
  useCuedPoster: jest.fn(),
}));

const mockedOverlayState = useOverlayActiveState as jest.MockedFunction<typeof useOverlayActiveState>;
const mockedCuedPoster = useCuedPoster as jest.MockedFunction<typeof useCuedPoster>;

const POSTERS = [
  { id: "p1", fileUrl: "/a.mp4", type: "video", startTime: null, endTime: null, endBehavior: null },
  { id: "p2", fileUrl: "https://youtu.be/abc", type: "youtube", startTime: null, endTime: null, endBehavior: null },
  { id: "p3", fileUrl: "/img.jpg", type: "image", startTime: null, endTime: null, endBehavior: null },
];

function makeCueHook(cue: Parameters<typeof mockedCuedPoster.mockReturnValue>[0]["cue"]) {
  mockedCuedPoster.mockReturnValue({
    cue,
    setCue: jest.fn(),
    updateCueTime: jest.fn(),
    updateCuePlaying: jest.fn(),
    clearCue: jest.fn(),
  });
}

function makeOverlayState(poster: Record<string, unknown>) {
  mockedOverlayState.mockReturnValue({
    lowerThird: { active: false },
    poster: { active: false, ...poster },
    countdown: { active: false },
    chatHighlight: { active: false },
  } as ReturnType<typeof useOverlayActiveState>);
}

describe("usePosterPreviewState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when no poster is active and no cue is set", () => {
    makeOverlayState({ active: false });
    makeCueHook(null);
    const { result } = renderHook(() => usePosterPreviewState({ posters: POSTERS }));
    expect(result.current).toBeNull();
  });

  it("returns cue state when a cue is set and no poster is active", () => {
    makeOverlayState({ active: false });
    makeCueHook({ posterId: "p1", currentTime: 10, isPlaying: false, displayMode: "left" });
    const { result } = renderHook(() => usePosterPreviewState({ posters: POSTERS }));
    expect(result.current?.mode).toBe("cue");
    expect(result.current?.poster.id).toBe("p1");
  });

  it("does NOT return cue state if the cued poster no longer exists", () => {
    makeOverlayState({ active: false });
    makeCueHook({ posterId: "deleted", currentTime: 0, isPlaying: false, displayMode: "left" });
    const { result } = renderHook(() => usePosterPreviewState({ posters: POSTERS }));
    expect(result.current).toBeNull();
  });

  it("drops cue if the cued poster is an image (not previewable)", () => {
    makeOverlayState({ active: false });
    makeCueHook({ posterId: "p3", currentTime: 0, isPlaying: false, displayMode: "left" });
    const { result } = renderHook(() => usePosterPreviewState({ posters: POSTERS }));
    expect(result.current).toBeNull();
  });

  it("returns live state only for the owner", () => {
    makeOverlayState({
      active: true,
      posterId: "p1",
      displayMode: "left",
      fileUrl: "/a.mp4",
      type: "video",
      ownerClientId: "me-1111",
    });
    makeCueHook(null);
    const { result } = renderHook(() => usePosterPreviewState({ posters: POSTERS }));
    expect(result.current?.mode).toBe("live");
    if (result.current?.mode === "live") {
      expect(result.current.poster.id).toBe("p1");
      expect(result.current.displayMode).toBe("left");
    }
  });

  it("returns null for non-owners even when a poster is live", () => {
    makeOverlayState({
      active: true,
      posterId: "p1",
      displayMode: "left",
      fileUrl: "/a.mp4",
      type: "video",
      ownerClientId: "someone-else",
    });
    makeCueHook(null);
    const { result } = renderHook(() => usePosterPreviewState({ posters: POSTERS }));
    expect(result.current).toBeNull();
  });

  it("does not return live state when the active poster is an image", () => {
    makeOverlayState({
      active: true,
      posterId: "p3",
      displayMode: "left",
      fileUrl: "/img.jpg",
      type: "image",
      ownerClientId: "me-1111",
    });
    makeCueHook(null);
    const { result } = renderHook(() => usePosterPreviewState({ posters: POSTERS }));
    expect(result.current).toBeNull();
  });

  it("prefers live (owned) over cue when both are set simultaneously", () => {
    // Edge case: a cue left over from before the poster went to air. The live
    // state should win because it represents what's actually on the overlay.
    makeOverlayState({
      active: true,
      posterId: "p2",
      displayMode: "bigpicture",
      fileUrl: "https://youtu.be/abc",
      type: "youtube",
      ownerClientId: "me-1111",
    });
    makeCueHook({ posterId: "p1", currentTime: 20, isPlaying: true, displayMode: "left" });
    const { result } = renderHook(() => usePosterPreviewState({ posters: POSTERS }));
    expect(result.current?.mode).toBe("live");
    if (result.current?.mode === "live") {
      expect(result.current.poster.id).toBe("p2");
    }
  });
});
