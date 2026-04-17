/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useCuedPoster } from "@/hooks/useCuedPoster";

const STORAGE_KEY = "ols.cuedPoster";

describe("useCuedPoster", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty when nothing is persisted", () => {
    const { result } = renderHook(() => useCuedPoster());
    expect(result.current.cue).toBeNull();
  });

  it("persists a cue to localStorage", () => {
    const { result } = renderHook(() => useCuedPoster());
    act(() => {
      result.current.setCue({
        posterId: "abc",
        currentTime: 42,
        isPlaying: false,
        displayMode: "left",
      });
    });
    expect(result.current.cue).toEqual({
      posterId: "abc",
      currentTime: 42,
      isPlaying: false,
      displayMode: "left",
    });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual({
      posterId: "abc",
      currentTime: 42,
      isPlaying: false,
      displayMode: "left",
    });
  });

  it("hydrates from localStorage on mount", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        posterId: "xyz",
        currentTime: 10,
        isPlaying: true,
        displayMode: "bigpicture",
      })
    );
    const { result } = renderHook(() => useCuedPoster());
    expect(result.current.cue?.posterId).toBe("xyz");
    expect(result.current.cue?.currentTime).toBe(10);
    expect(result.current.cue?.isPlaying).toBe(true);
    expect(result.current.cue?.displayMode).toBe("bigpicture");
  });

  it("updates the cue time without clobbering other fields", () => {
    const { result } = renderHook(() => useCuedPoster());
    act(() => {
      result.current.setCue({
        posterId: "abc",
        currentTime: 0,
        isPlaying: false,
        displayMode: "left",
      });
    });
    act(() => {
      result.current.updateCueTime(77.5);
    });
    expect(result.current.cue?.currentTime).toBe(77.5);
    expect(result.current.cue?.posterId).toBe("abc");
  });

  it("clearCue removes the cue from state and localStorage", () => {
    const { result } = renderHook(() => useCuedPoster());
    act(() => {
      result.current.setCue({
        posterId: "abc",
        currentTime: 1,
        isPlaying: true,
        displayMode: "right",
      });
    });
    act(() => {
      result.current.clearCue();
    });
    expect(result.current.cue).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("ignores malformed localStorage entries on load", () => {
    window.localStorage.setItem(STORAGE_KEY, "{ not valid json");
    const { result } = renderHook(() => useCuedPoster());
    expect(result.current.cue).toBeNull();
  });
});
