/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { CountdownRenderer } from '@/components/overlays/CountdownRenderer';

// Mock WebSocket
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  
  readyState: number = 0; // CONNECTING
  
  send = jest.fn();
  close = jest.fn((code?: number, reason?: string) => {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || '' } as any);
    }
  });

  simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
}

// Define WebSocket constants
const MOCK_WEBSOCKET_CONNECTING = 0;
const MOCK_WEBSOCKET_OPEN = 1;
const MOCK_WEBSOCKET_CLOSING = 2;
const MOCK_WEBSOCKET_CLOSED = 3;

describe('CountdownRenderer', () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    (global as any).WebSocket = jest.fn(() => mockWs);
    (global as any).WebSocket.CONNECTING = MOCK_WEBSOCKET_CONNECTING;
    (global as any).WebSocket.OPEN = MOCK_WEBSOCKET_OPEN;
    (global as any).WebSocket.CLOSING = MOCK_WEBSOCKET_CLOSING;
    (global as any).WebSocket.CLOSED = MOCK_WEBSOCKET_CLOSED;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing initially', () => {
    const { container } = render(<CountdownRenderer />);
    expect(container.firstChild).toBeNull();
  });

  it('should connect to WebSocket on mount', () => {
    render(<CountdownRenderer />);
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3003');
  });

  it('should display countdown when set event is received', async () => {
    render(<CountdownRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
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
    render(<CountdownRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'set',
        payload: { seconds: 30 },
        id: 'test-event-2',
      },
    });

    await waitFor(() => {
      expect(mockWs.send).toHaveBeenCalledWith(
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
    render(<CountdownRenderer />);
    mockWs.simulateOpen();

    // First set the countdown
    mockWs.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'set',
        payload: { seconds: 10 },
        id: 'test-event-3',
      },
    });

    // Then start it
    mockWs.simulateMessage({
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
    render(<CountdownRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
      channel: 'countdown',
      data: {
        type: 'pause',
        id: 'test-event-5',
      },
    });

    await waitFor(() => {
      expect(mockWs.send).toHaveBeenCalled();
    });
  });

  it('should handle reset event', async () => {
    render(<CountdownRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
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
    render(<CountdownRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
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
    render(<CountdownRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
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
    const { unmount } = render(<CountdownRenderer />);
    unmount();
    expect(mockWs.close).toHaveBeenCalled();
  });

  it('should handle invalid JSON messages gracefully', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    render(<CountdownRenderer />);
    mockWs.simulateOpen();

    if (mockWs.onmessage) {
      mockWs.onmessage(new MessageEvent('message', { data: 'invalid json' }));
    }

    expect(consoleError).toHaveBeenCalledWith(
      '[Countdown] Failed to parse message:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});

