/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { useTimeoutMap } from "@/lib/hooks/useTimeoutMap";

describe("useTimeoutMap", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return a stable reference across re-renders", () => {
    const { result, rerender } = renderHook(() => useTimeoutMap());

    const firstResult = result.current;

    // Re-render multiple times
    rerender();
    rerender();
    rerender();

    // The returned object should be the same reference
    expect(result.current).toBe(firstResult);
    expect(result.current.set).toBe(firstResult.set);
    expect(result.current.clear).toBe(firstResult.clear);
    expect(result.current.clearAll).toBe(firstResult.clearAll);
  });

  it("should not cause useEffect to re-run when used as dependency", () => {
    let effectRunCount = 0;

    const { rerender } = renderHook(() => {
      const timeouts = useTimeoutMap();

      // This simulates how usePresenterWebSocket uses timeouts
      // If timeouts changes on re-render, this effect would run again
      const { useEffect } = require("react");
      useEffect(() => {
        effectRunCount++;
        return () => {};
      }, [timeouts]);

      return timeouts;
    });

    expect(effectRunCount).toBe(1);

    // Re-render multiple times
    rerender();
    rerender();
    rerender();

    // Effect should still only have run once
    expect(effectRunCount).toBe(1);
  });
});
