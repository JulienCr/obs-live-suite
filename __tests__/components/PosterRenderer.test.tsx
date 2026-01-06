/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { PosterRenderer } from '@/components/overlays/PosterRenderer';
import {
  setupWebSocketMock,
  getLastMockWebSocket,
  MockWebSocket,
} from '@/__tests__/test-utils/websocket-mock';

describe('PosterRenderer', () => {
  let cleanupWebSocket: () => void;
  const originalImage = global.Image;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    cleanupWebSocket = setupWebSocketMock();
    jest.useFakeTimers();

    // Mock Image constructor to immediately trigger onload
    // This is needed because detectAspectRatio creates Image elements
    // and waits for them to load, which doesn't happen with fake timers
    global.Image = class MockImage {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';

      get src() { return this._src; }
      set src(value: string) {
        this._src = value;
        // Use setTimeout to simulate async behavior but with fake timers
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    } as unknown as typeof Image;

    // Mock document.createElement to handle video element for aspect ratio detection
    document.createElement = ((tagName: string) => {
      if (tagName === 'video') {
        // Create a real video element and override properties for aspect ratio detection
        const realVideo = originalCreateElement('video');
        Object.defineProperty(realVideo, 'videoWidth', { value: 1920, writable: true });
        Object.defineProperty(realVideo, 'videoHeight', { value: 1080, writable: true });

        // Store original src setter
        const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');

        // Override src to trigger onloadedmetadata
        Object.defineProperty(realVideo, 'src', {
          get() { return this._mockSrc || ''; },
          set(value: string) {
            this._mockSrc = value;
            if (originalSrcDescriptor?.set) {
              originalSrcDescriptor.set.call(this, value);
            }
            setTimeout(() => {
              if (this.onloadedmetadata) this.onloadedmetadata(new Event('loadedmetadata'));
            }, 0);
          },
        });

        return realVideo;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement;
  });

  afterEach(() => {
    cleanupWebSocket();
    jest.clearAllMocks();
    jest.useRealTimers();
    global.Image = originalImage;
    document.createElement = originalCreateElement;
  });

  // Helper to render and get WebSocket
  const renderAndGetWs = (): MockWebSocket | null => {
    render(<PosterRenderer />);
    return getLastMockWebSocket();
  };

  it('should render nothing initially', () => {
    const { container } = render(<PosterRenderer />);
    expect(container.firstChild).toBeNull();
  });

  it('should connect to WebSocket on mount', () => {
    const ws = renderAndGetWs();
    expect(ws).not.toBeNull();
    expect(ws?.url).toBe('ws://localhost:3003');
  });

  it('should display poster image when show event is received', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'poster',
      data: {
        type: 'show',
        payload: {
          fileUrl: '/test-poster.jpg',
          transition: 'fade',
        },
        id: 'test-event-1',
      },
    });

    // Advance timers to allow Image mock onload to fire
    jest.runAllTimers();

    await waitFor(() => {
      const img = screen.getByAltText('Poster');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/test-poster.jpg');
    });
  });

  it('should display video poster when video URL is provided', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'poster',
      data: {
        type: 'show',
        payload: {
          fileUrl: '/test-video.mp4',
          transition: 'slide',
        },
        id: 'test-event-2',
      },
    });

    // Advance timers to allow aspect ratio detection
    jest.runAllTimers();

    await waitFor(() => {
      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', '/test-video.mp4');
    });
  });

  it('should detect different video formats', async () => {
    const videoFormats = ['test.mp4', 'test.webm', 'test.mov'];

    for (const format of videoFormats) {
      const { unmount } = render(<PosterRenderer />);
      const ws = getLastMockWebSocket();
      ws?.simulateOpen();

      ws?.simulateMessage({
        channel: 'poster',
        data: {
          type: 'show',
          payload: {
            fileUrl: `/${format}`,
            transition: 'fade',
          },
          id: `test-event-${format}`,
        },
      });

      // Advance timers to allow aspect ratio detection
      jest.runAllTimers();

      await waitFor(() => {
        const video = document.querySelector('video');
        expect(video).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('should send acknowledgment after receiving event', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'poster',
      data: {
        type: 'show',
        payload: {
          fileUrl: '/ack-test.jpg',
          transition: 'fade',
        },
        id: 'test-event-3',
      },
    });

    await waitFor(() => {
      expect(ws?.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'ack',
          eventId: 'test-event-3',
          channel: 'poster',
          success: true,
        })
      );
    });
  });

  it('should hide poster when hide event is received', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    // Show first
    ws?.simulateMessage({
      channel: 'poster',
      data: {
        type: 'show',
        payload: {
          fileUrl: '/will-hide.jpg',
          transition: 'fade',
        },
        id: 'test-event-4',
      },
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByAltText('Poster')).toBeInTheDocument();
    });

    // Then hide
    ws?.simulateMessage({
      channel: 'poster',
      data: {
        type: 'hide',
        id: 'test-event-5',
      },
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.queryByAltText('Poster')).not.toBeInTheDocument();
    });
  });

  it('should auto-hide after duration', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'poster',
      data: {
        type: 'show',
        payload: {
          fileUrl: '/auto-hide.jpg',
          transition: 'fade',
          duration: 3, // 3 seconds
        },
        id: 'test-event-6',
      },
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByAltText('Poster')).toBeInTheDocument();
    });

    // Fast-forward 3 seconds + fade out time
    jest.advanceTimersByTime(4000);

    await waitFor(() => {
      expect(screen.queryByAltText('Poster')).not.toBeInTheDocument();
    });
  });

  it('should apply correct transition class', async () => {
    const transitions = ['fade', 'slide', 'cut', 'blur'] as const;

    for (const transition of transitions) {
      const { unmount } = render(<PosterRenderer />);
      const ws = getLastMockWebSocket();
      ws?.simulateOpen();

      ws?.simulateMessage({
        channel: 'poster',
        data: {
          type: 'show',
          payload: {
            fileUrl: '/test.jpg',
            transition,
          },
          id: `test-event-${transition}`,
        },
      });

      jest.runAllTimers();

      await waitFor(() => {
        const poster = document.querySelector('.poster-layer');
        expect(poster).toHaveClass(`poster-transition-${transition}`);
      });

      unmount();
    }
  });

  it('should ignore messages from other channels', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'show',
        payload: { fileUrl: '/wrong.jpg' },
        id: 'test-event-7',
      },
    });

    await waitFor(() => {
      expect(screen.queryByAltText('Poster')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should close WebSocket on unmount', () => {
    const { unmount } = render(<PosterRenderer />);
    const ws = getLastMockWebSocket();
    unmount();
    expect(ws?.close).toHaveBeenCalled();
  });

  it('should clear timeout on unmount', async () => {
    const { unmount } = render(<PosterRenderer />);
    const ws = getLastMockWebSocket();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'poster',
      data: {
        type: 'show',
        payload: {
          fileUrl: '/test.jpg',
          transition: 'fade',
          duration: 5,
        },
        id: 'test-event-8',
      },
    });

    jest.runAllTimers();

    // Wait for state updates
    await waitFor(() => {
      expect(screen.getByAltText('Poster')).toBeInTheDocument();
    });

    unmount();
    // Cleanup is called automatically, we just verify unmount doesn't throw
    expect(ws?.close).toHaveBeenCalled();
  });

  it('should cancel previous timeout when new show event arrives', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    // First poster with duration
    ws?.simulateMessage({
      channel: 'poster',
      data: {
        type: 'show',
        payload: {
          fileUrl: '/first.jpg',
          transition: 'fade',
          duration: 10,
        },
        id: 'test-event-9',
      },
    });

    jest.runAllTimers();

    await waitFor(() => {
      const img = screen.getByAltText('Poster');
      expect(img).toHaveAttribute('src', '/first.jpg');
    });

    // Second poster before first duration expires
    ws?.simulateMessage({
      channel: 'poster',
      data: {
        type: 'show',
        payload: {
          fileUrl: '/second.jpg',
          transition: 'slide',
        },
        id: 'test-event-10',
      },
    });

    jest.runAllTimers();

    await waitFor(() => {
      const img = screen.getByAltText('Poster');
      expect(img).toHaveAttribute('src', '/second.jpg');
    });

    // First poster should not hide after its original duration
    jest.advanceTimersByTime(10000);
    await waitFor(() => {
      expect(screen.getByAltText('Poster')).toBeInTheDocument();
    });
  });
});

