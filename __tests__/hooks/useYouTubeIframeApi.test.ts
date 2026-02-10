/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useYouTubeIframeApi } from '@/hooks/useYouTubeIframeApi';

const YOUTUBE_ORIGIN = 'https://www.youtube.com';

const DEFAULT_STATE = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isMuted: true,
};

function createMockIframeRef() {
  const mockPostMessage = jest.fn();
  const mockContentWindow = { postMessage: mockPostMessage };
  const iframeRef = {
    current: { contentWindow: mockContentWindow },
  } as unknown as React.RefObject<HTMLIFrameElement | null>;
  return { iframeRef, mockPostMessage, mockContentWindow };
}

function dispatchYouTubeMessage(
  source: unknown,
  data: Record<string, unknown>
) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: JSON.stringify(data),
      source: source as Window,
    })
  );
}

describe('useYouTubeIframeApi', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── 1. Initial state ───────────────────────────────────────────

  describe('initial state', () => {
    it('returns DEFAULT_STATE and isSubscribed=false', () => {
      const { iframeRef } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'test-1',
          enabled: true,
        })
      );

      expect(result.current.state).toEqual(DEFAULT_STATE);
      expect(result.current.stateRef.current).toEqual(DEFAULT_STATE);
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  // ── 2. handleIframeLoad triple retry ───────────────────────────

  describe('handleIframeLoad', () => {
    it('calls postMessage 3 times at 0ms, 500ms, 1500ms with listening payload', () => {
      const { iframeRef, mockPostMessage } = createMockIframeRef();
      // Use a large pollingInterval to isolate handleIframeLoad retries
      // from polling-driven sendListening calls
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'load-test',
          enabled: true,
          pollingInterval: 10000,
        })
      );

      const listeningPayload = JSON.stringify({
        event: 'listening',
        id: 'load-test',
        channel: 'widget',
      });

      // Clear any calls from the effect setup
      mockPostMessage.mockClear();

      act(() => {
        result.current.handleIframeLoad();
      });

      // Immediate call (0ms)
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(
        listeningPayload,
        YOUTUBE_ORIGIN
      );

      // After 500ms
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(mockPostMessage).toHaveBeenCalledTimes(2);

      // After 1500ms total
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockPostMessage).toHaveBeenCalledTimes(3);

      // All calls use the same listening payload
      for (const call of mockPostMessage.mock.calls) {
        expect(call).toEqual([listeningPayload, YOUTUBE_ORIGIN]);
      }
    });
  });

  // ── 3. onReady triggers sendListening ──────────────────────────

  describe('onReady event', () => {
    it('sends listening payload when onReady is received', () => {
      const { iframeRef, mockPostMessage, mockContentWindow } =
        createMockIframeRef();
      renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'ready-test',
          enabled: true,
        })
      );

      mockPostMessage.mockClear();

      act(() => {
        dispatchYouTubeMessage(mockContentWindow, { event: 'onReady' });
      });

      const listeningPayload = JSON.stringify({
        event: 'listening',
        id: 'ready-test',
        channel: 'widget',
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        listeningPayload,
        YOUTUBE_ORIGIN
      );
    });
  });

  // ── 4. infoDelivery updates stateRef ───────────────────────────

  describe('infoDelivery updates', () => {
    it('updates currentTime from infoDelivery', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'info-test',
          enabled: true,
        })
      );

      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { currentTime: 42.5 },
        });
      });

      expect(result.current.stateRef.current.currentTime).toBe(42.5);
    });

    it('updates duration when > 0', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'info-test',
          enabled: true,
        })
      );

      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { duration: 120.0 },
        });
      });

      expect(result.current.stateRef.current.duration).toBe(120.0);
    });

    it('does not update duration when 0', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'info-test',
          enabled: true,
        })
      );

      // First set a real duration
      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { duration: 60.0 },
        });
      });

      expect(result.current.stateRef.current.duration).toBe(60.0);

      // Then send duration 0 — should NOT overwrite
      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { duration: 0 },
        });
      });

      expect(result.current.stateRef.current.duration).toBe(60.0);
    });

    it('sets isPlaying=true when playerState===1', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'info-test',
          enabled: true,
        })
      );

      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { playerState: 1 },
        });
      });

      expect(result.current.stateRef.current.isPlaying).toBe(true);
    });

    it('sets isPlaying=false when playerState!==1', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'info-test',
          enabled: true,
        })
      );

      // First make it playing
      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { playerState: 1 },
        });
      });

      expect(result.current.stateRef.current.isPlaying).toBe(true);

      // Then pause (playerState=2)
      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { playerState: 2 },
        });
      });

      expect(result.current.stateRef.current.isPlaying).toBe(false);
    });

    it('updates muted state', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'info-test',
          enabled: true,
        })
      );

      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { muted: false },
        });
      });

      expect(result.current.stateRef.current.isMuted).toBe(false);
    });
  });

  // ── 5. First infoDelivery sets isSubscribed ────────────────────

  describe('subscription tracking', () => {
    it('sets isSubscribed=true on first infoDelivery', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'sub-test',
          enabled: true,
        })
      );

      expect(result.current.isSubscribed).toBe(false);

      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { currentTime: 1 },
        });
      });

      // isSubscribed is a React state, updated asynchronously
      // Flush the state update
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  // ── 6. Controls send correct postMessage commands ──────────────

  describe('controls', () => {
    it('seek sends seekTo command with [time, true]', () => {
      const { iframeRef, mockPostMessage } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'ctrl',
          enabled: true,
        })
      );

      mockPostMessage.mockClear();

      act(() => {
        result.current.seek(30);
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [30, true] }),
        YOUTUBE_ORIGIN
      );
      expect(result.current.stateRef.current.currentTime).toBe(30);
    });

    it('play sends playVideo command', () => {
      const { iframeRef, mockPostMessage } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'ctrl',
          enabled: true,
        })
      );

      mockPostMessage.mockClear();

      act(() => {
        result.current.play();
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
        YOUTUBE_ORIGIN
      );
      expect(result.current.stateRef.current.isPlaying).toBe(true);
    });

    it('pause sends pauseVideo command', () => {
      const { iframeRef, mockPostMessage } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'ctrl',
          enabled: true,
        })
      );

      mockPostMessage.mockClear();

      act(() => {
        result.current.pause();
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
        YOUTUBE_ORIGIN
      );
      expect(result.current.stateRef.current.isPlaying).toBe(false);
    });

    it('stop sends stopVideo command', () => {
      const { iframeRef, mockPostMessage } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'ctrl',
          enabled: true,
        })
      );

      mockPostMessage.mockClear();

      act(() => {
        result.current.stop();
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'stopVideo', args: '' }),
        YOUTUBE_ORIGIN
      );
      expect(result.current.stateRef.current.isPlaying).toBe(false);
    });

    it('mute sends mute command', () => {
      const { iframeRef, mockPostMessage } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'ctrl',
          enabled: true,
        })
      );

      mockPostMessage.mockClear();

      act(() => {
        result.current.mute();
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'mute', args: '' }),
        YOUTUBE_ORIGIN
      );
      expect(result.current.stateRef.current.isMuted).toBe(true);
    });

    it('unmute sends unMute command', () => {
      const { iframeRef, mockPostMessage } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'ctrl',
          enabled: true,
        })
      );

      mockPostMessage.mockClear();

      act(() => {
        result.current.unmute();
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({ event: 'command', func: 'unMute', args: '' }),
        YOUTUBE_ORIGIN
      );
      expect(result.current.stateRef.current.isMuted).toBe(false);
    });
  });

  // ── 7. Polling syncs stateRef → state ──────────────────────────

  describe('polling', () => {
    it('syncs stateRef to React state at pollingInterval', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'poll-test',
          enabled: true,
          pollingInterval: 200,
        })
      );

      // Initially state reflects default
      expect(result.current.state.currentTime).toBe(0);

      // Update stateRef via infoDelivery (updates ref, not React state directly)
      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { currentTime: 99.9 },
        });
      });

      // stateRef is updated immediately
      expect(result.current.stateRef.current.currentTime).toBe(99.9);

      // React state hasn't been synced yet by polling (may or may not match depending on timing)
      // Advance to the polling interval to guarantee sync
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Now React state should reflect the ref
      expect(result.current.state.currentTime).toBe(99.9);
    });

    // ── 8. Polling retries sendListening if not subscribed ─────────

    it('retries sendListening at each poll if not subscribed', () => {
      const { iframeRef, mockPostMessage } = createMockIframeRef();
      renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'retry-test',
          enabled: true,
          pollingInterval: 500,
        })
      );

      const listeningPayload = JSON.stringify({
        event: 'listening',
        id: 'retry-test',
        channel: 'widget',
      });

      mockPostMessage.mockClear();

      // Advance one polling interval
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should have called sendListening (retry because not subscribed)
      expect(mockPostMessage).toHaveBeenCalledWith(
        listeningPayload,
        YOUTUBE_ORIGIN
      );

      mockPostMessage.mockClear();

      // Another interval
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        listeningPayload,
        YOUTUBE_ORIGIN
      );
    });

    it('does not retry sendListening when subscribed', () => {
      const { iframeRef, mockPostMessage, mockContentWindow } =
        createMockIframeRef();
      renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'no-retry',
          enabled: true,
          pollingInterval: 500,
        })
      );

      // Subscribe via infoDelivery
      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { currentTime: 5 },
        });
      });

      mockPostMessage.mockClear();

      // Advance polling interval
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should NOT have sent listening payload (only setState occurs in the interval)
      const listeningPayload = JSON.stringify({
        event: 'listening',
        id: 'no-retry',
        channel: 'widget',
      });
      const listeningCalls = mockPostMessage.mock.calls.filter(
        (call) => call[0] === listeningPayload
      );
      expect(listeningCalls).toHaveLength(0);
    });
  });

  // ── 9. resetState ──────────────────────────────────────────────

  describe('resetState', () => {
    it('resets stateRef, state, and isSubscribed', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'reset-test',
          enabled: true,
          pollingInterval: 100,
        })
      );

      // Modify state via infoDelivery
      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { currentTime: 50, duration: 200, playerState: 1, muted: false },
        });
      });

      // Sync via polling
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.state.currentTime).toBe(50);
      expect(result.current.isSubscribed).toBe(true);

      // Now reset
      act(() => {
        result.current.resetState();
      });

      expect(result.current.state).toEqual(DEFAULT_STATE);
      expect(result.current.stateRef.current).toEqual(DEFAULT_STATE);
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  // ── 10. Ignores messages from wrong source ─────────────────────

  describe('message filtering', () => {
    it('ignores messages from a different source', () => {
      const { iframeRef } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'filter-test',
          enabled: true,
        })
      );

      // Dispatch from a different source (not the iframe's contentWindow)
      const differentWindow = {} as Window;
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: JSON.stringify({
              event: 'infoDelivery',
              info: { currentTime: 999 },
            }),
            source: differentWindow,
          })
        );
      });

      expect(result.current.stateRef.current.currentTime).toBe(0);
    });

    // ── 11. Ignores non-string data ────────────────────────────────

    it('ignores messages with non-string data', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const { result } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'filter-test',
          enabled: true,
        })
      );

      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { event: 'infoDelivery', info: { currentTime: 888 } },
            source: mockContentWindow as unknown as Window,
          })
        );
      });

      expect(result.current.stateRef.current.currentTime).toBe(0);
    });
  });

  // ── 12. Cleanup ────────────────────────────────────────────────

  describe('cleanup', () => {
    it('removes message listener and clears interval on unmount', () => {
      const { iframeRef, mockContentWindow } = createMockIframeRef();
      const addSpy = jest.spyOn(window, 'addEventListener');
      const removeSpy = jest.spyOn(window, 'removeEventListener');

      const { result, unmount } = renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'cleanup-test',
          enabled: true,
          pollingInterval: 100,
        })
      );

      // The effect adds a message listener
      expect(addSpy).toHaveBeenCalledWith('message', expect.any(Function));

      const handler = addSpy.mock.calls.find(
        (call) => call[0] === 'message'
      )![1];

      unmount();

      // Should remove the same listener
      expect(removeSpy).toHaveBeenCalledWith('message', handler);

      // After unmount, advancing timers should not cause errors
      // (interval should be cleared)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Also verify that messages dispatched after unmount don't update stateRef
      act(() => {
        dispatchYouTubeMessage(mockContentWindow, {
          event: 'infoDelivery',
          info: { currentTime: 777 },
        });
      });

      // stateRef was captured before unmount, but the listener is removed
      expect(result.current.stateRef.current.currentTime).not.toBe(777);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  // ── 13. enabled=false skips setup ──────────────────────────────

  describe('enabled=false', () => {
    it('does not add message listener or set up interval', () => {
      const addSpy = jest.spyOn(window, 'addEventListener');
      const { iframeRef, mockPostMessage } = createMockIframeRef();

      renderHook(() =>
        useYouTubeIframeApi({
          iframeRef,
          listenerId: 'disabled-test',
          enabled: false,
        })
      );

      // Should not have added a message listener from our effect
      const messageCalls = addSpy.mock.calls.filter(
        (call) => call[0] === 'message'
      );
      expect(messageCalls).toHaveLength(0);

      // Advancing timers should not trigger any sendListening calls
      mockPostMessage.mockClear();
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(mockPostMessage).not.toHaveBeenCalled();

      addSpy.mockRestore();
    });
  });
});
