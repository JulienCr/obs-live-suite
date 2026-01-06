/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { LowerThirdRenderer } from '@/components/overlays/LowerThirdRenderer';
import {
  setupWebSocketMock,
  getLastMockWebSocket,
  type MockWebSocket,
} from '@/__tests__/test-utils/websocket-mock';

describe('LowerThirdRenderer', () => {
  let mockWs: MockWebSocket | null;
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

  // Helper to get the mock WebSocket after rendering
  const renderAndGetWs = () => {
    render(<LowerThirdRenderer />);
    mockWs = getLastMockWebSocket();
    return mockWs;
  };

  it('should render nothing initially', () => {
    const { container } = render(<LowerThirdRenderer />);
    expect(container.firstChild).toBeNull();
  });

  it('should connect to WebSocket on mount', () => {
    renderAndGetWs();
    expect(mockWs).not.toBeNull();
    expect(mockWs?.url).toBe('ws://localhost:3003');
  });

  it('should display lower third when show event is received', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'lower',
      data: {
        type: 'show',
        payload: {
          title: 'Test Title',
          subtitle: 'Test Subtitle',
          side: 'left',
        },
        id: 'test-event-1',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });
  });

  it('should send acknowledgment after receiving event', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'lower',
      data: {
        type: 'show',
        payload: {
          title: 'Ack Test',
        },
        id: 'test-event-2',
      },
    });

    await waitFor(() => {
      expect(ws?.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'ack',
          eventId: 'test-event-2',
          channel: 'lower',
          success: true,
        })
      );
    });
  });

  it('should hide lower third when hide event is received', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    // Show first
    ws?.simulateMessage({
      channel: 'lower',
      data: {
        type: 'show',
        payload: {
          title: 'Will Hide',
        },
        id: 'test-event-3',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Will Hide')).toBeInTheDocument();
    });

    // Then hide
    ws?.simulateMessage({
      channel: 'lower',
      data: {
        type: 'hide',
        id: 'test-event-4',
      },
    });

    await waitFor(() => {
      expect(screen.queryByText('Will Hide')).not.toBeInTheDocument();
    });
  });

  it('should auto-hide after duration', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'lower',
      data: {
        type: 'show',
        payload: {
          title: 'Auto Hide',
          duration: 2, // 2 seconds
        },
        id: 'test-event-5',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Auto Hide')).toBeInTheDocument();
    });

    // Fast-forward 2 seconds
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.queryByText('Auto Hide')).not.toBeInTheDocument();
    });
  });

  it('should update lower third content', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    // Show first
    ws?.simulateMessage({
      channel: 'lower',
      data: {
        type: 'show',
        payload: {
          title: 'Original Title',
        },
        id: 'test-event-6',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Original Title')).toBeInTheDocument();
    });

    // Update
    ws?.simulateMessage({
      channel: 'lower',
      data: {
        type: 'update',
        payload: {
          title: 'Updated Title',
        },
        id: 'test-event-7',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
      expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
    });
  });

  it('should apply correct side class', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'lower',
      data: {
        type: 'show',
        payload: {
          title: 'Right Side',
          side: 'right',
        },
        id: 'test-event-8',
      },
    });

    await waitFor(() => {
      const element = screen.getByText('Right Side').closest('.lower-third');
      expect(element).toHaveClass('lower-third-right');
    });
  });

  it('should ignore messages from other channels', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'show',
        payload: { title: 'Wrong Channel' },
        id: 'test-event-9',
      },
    });

    await waitFor(() => {
      expect(screen.queryByText('Wrong Channel')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should close WebSocket on unmount', () => {
    const ws = renderAndGetWs();
    const { unmount } = render(<LowerThirdRenderer />);
    unmount();
    expect(ws?.close).toHaveBeenCalled();
  });

  it('should clear timeout on unmount', async () => {
    const { unmount } = render(<LowerThirdRenderer />);
    const ws = getLastMockWebSocket();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'lower',
      data: {
        type: 'show',
        payload: {
          title: 'Test',
          duration: 5,
        },
        id: 'test-event-10',
      },
    });

    // Wait for state updates
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    unmount();
    // Cleanup is called automatically, we just verify unmount doesn't throw
    expect(ws?.close).toHaveBeenCalled();
  });
});

