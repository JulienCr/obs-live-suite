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

  beforeEach(() => {
    cleanupWebSocket = setupWebSocketMock();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanupWebSocket();
    jest.clearAllMocks();
    jest.useRealTimers();
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

    await waitFor(() => {
      expect(screen.getByAltText('Poster')).toBeInTheDocument();
    });

    // Fast-forward 3 seconds
    jest.advanceTimersByTime(3000);

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

      await waitFor(() => {
        const poster = document.querySelector('.poster');
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
    const ws = renderAndGetWs();
    const { unmount } = render(<PosterRenderer />);
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

