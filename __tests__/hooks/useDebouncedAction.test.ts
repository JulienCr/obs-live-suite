/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useDebouncedAction } from '@/hooks/useDebouncedAction';

describe('useDebouncedAction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce action by specified delay', () => {
    const action = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedAction(action, { delay: 200 })
    );

    act(() => {
      result.current('test-arg');
    });

    // Action should not be called immediately
    expect(action).not.toHaveBeenCalled();

    // Advance time by 199ms - still should not be called
    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(action).not.toHaveBeenCalled();

    // Advance time by 1ms more (total 200ms) - now should be called
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith('test-arg');
  });

  it('should use default delay of 100ms when not specified', () => {
    const action = jest.fn();
    const { result } = renderHook(() => useDebouncedAction(action));

    act(() => {
      result.current();
    });

    expect(action).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(99);
    });
    expect(action).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should execute immediately when enabled is false', () => {
    const action = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedAction(action, { delay: 200, enabled: false })
    );

    act(() => {
      result.current('immediate-arg');
    });

    // Should be called immediately without waiting
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith('immediate-arg');
  });

  it('should clear timeout on unmount (cleanup)', () => {
    const action = jest.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedAction(action, { delay: 200 })
    );

    act(() => {
      result.current('cleanup-arg');
    });

    // Unmount before timeout completes
    unmount();

    // Advance time past the delay
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Action should not be called because timeout was cleared on unmount
    expect(action).not.toHaveBeenCalled();
  });

  it('should clear previous timeout when called again before delay expires', () => {
    const action = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedAction(action, { delay: 100 })
    );

    act(() => {
      result.current('first-call');
    });

    // Advance time by 50ms (halfway through delay)
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Call again - this should clear the previous timeout
    act(() => {
      result.current('second-call');
    });

    // Advance time by 50ms more - total 100ms from start, but only 50ms from second call
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Action should not have been called yet (second call reset the timer)
    expect(action).not.toHaveBeenCalled();

    // Advance time by 50ms more to complete the second delay
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Now the action should be called once with the second argument
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith('second-call');
  });

  it('should use latest action reference (not stale closure)', () => {
    const action1 = jest.fn();
    const action2 = jest.fn();

    const { result, rerender } = renderHook(
      ({ action }) => useDebouncedAction(action, { delay: 100 }),
      { initialProps: { action: action1 } }
    );

    act(() => {
      result.current('arg');
    });

    // Update the action before timeout completes
    rerender({ action: action2 });

    // Complete the timeout
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should call the new action (action2), not the original (action1)
    expect(action1).not.toHaveBeenCalled();
    expect(action2).toHaveBeenCalledTimes(1);
    expect(action2).toHaveBeenCalledWith('arg');
  });

  it('should handle multiple arguments correctly', () => {
    const action = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedAction(action, { delay: 100 })
    );

    act(() => {
      result.current('arg1', 'arg2', 'arg3');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(action).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should return stable function reference when options do not change', () => {
    const action = jest.fn();
    const { result, rerender } = renderHook(() =>
      useDebouncedAction(action, { delay: 100 })
    );

    const firstReference = result.current;

    rerender();

    expect(result.current).toBe(firstReference);
  });

  it('should update function reference when delay changes', () => {
    const action = jest.fn();
    const { result, rerender } = renderHook(
      ({ delay }) => useDebouncedAction(action, { delay }),
      { initialProps: { delay: 100 } }
    );

    const firstReference = result.current;

    rerender({ delay: 200 });

    expect(result.current).not.toBe(firstReference);
  });

  it('should update function reference when enabled changes', () => {
    const action = jest.fn();
    const { result, rerender } = renderHook(
      ({ enabled }) => useDebouncedAction(action, { delay: 100, enabled }),
      { initialProps: { enabled: true } }
    );

    const firstReference = result.current;

    rerender({ enabled: false });

    expect(result.current).not.toBe(firstReference);
  });
});
