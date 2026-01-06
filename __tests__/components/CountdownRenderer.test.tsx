/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { CountdownRenderer } from '@/components/overlays/CountdownRenderer';
import {
  setupWebSocketMock,
  getLastMockWebSocket,
  type MockWebSocket,
} from '@/__tests__/test-utils/websocket-mock';

describe('CountdownRenderer', () => {
  let cleanupWebSocket: () => void;

  beforeEach(() => {
    cleanupWebSocket = setupWebSocketMock();
  });

  afterEach(() => {
    cleanupWebSocket();
    jest.clearAllMocks();
  });

  // Helper to render and get WebSocket
  const renderAndGetWs = (): MockWebSocket | null => {
    render(<CountdownRenderer />);
    return getLastMockWebSocket();
  };

  it('should render nothing initially', () => {
    const { container } = render(<CountdownRenderer />);
    expect(container.firstChild).toBeNull();
  });

  it('should connect to WebSocket on mount', () => {
    const ws = renderAndGetWs();
    expect(ws).not.toBeNull();
    expect(ws?.url).toBe('ws://localhost:3003');
  });

  it('should display countdown when set event is received', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'set',
        payload: { seconds: 60 },
        id: 'test-event-1',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('01:00')).toBeInTheDocument();
    });
  });

  it('should send acknowledgment after receiving event', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'set',
        payload: { seconds: 30 },
        id: 'test-event-2',
      },
    });

    await waitFor(() => {
      expect(ws?.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'ack',
          eventId: 'test-event-2',
          channel: 'countdown',
          success: true,
        })
      );
    });
  });

  it('should handle start event', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    // First set the countdown
    ws?.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'set',
        payload: { seconds: 10 },
        id: 'test-event-3',
      },
    });

    // Then start it
    ws?.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'start',
        id: 'test-event-4',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('00:10')).toBeInTheDocument();
    });
  });

  it('should handle pause event', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'pause',
        id: 'test-event-5',
      },
    });

    await waitFor(() => {
      expect(ws?.send).toHaveBeenCalled();
    });
  });

  it('should handle reset event', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'reset',
        id: 'test-event-6',
      },
    });

    await waitFor(() => {
      const container = screen.queryByText(/\d{2}:\d{2}/);
      expect(container).not.toBeInTheDocument();
    });
  });

  it('should format time correctly', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'set',
        payload: { seconds: 125 }, // 2 minutes 5 seconds
        id: 'test-event-7',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('02:05')).toBeInTheDocument();
    });
  });

  it('should ignore messages from other channels', async () => {
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    ws?.simulateMessage({
      channel: 'lower',
      data: {
        type: 'set',
        payload: { seconds: 60 },
        id: 'test-event-8',
      },
    });

    // Should not render anything
    await waitFor(() => {
      const container = screen.queryByText(/\d{2}:\d{2}/);
      expect(container).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should close WebSocket on unmount', () => {
    const ws = renderAndGetWs();
    const { unmount } = render(<CountdownRenderer />);
    unmount();
    expect(ws?.close).toHaveBeenCalled();
  });

  it('should handle invalid JSON messages gracefully', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const ws = renderAndGetWs();
    ws?.simulateOpen();

    // Use simulateRawMessage to send invalid JSON
    ws?.simulateRawMessage('invalid json');

    expect(consoleError).toHaveBeenCalledWith(
      '[Countdown] Failed to parse message:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});

