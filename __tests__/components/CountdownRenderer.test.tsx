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
  
  send = jest.fn();
  close = jest.fn();

  simulateOpen() {
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

describe('CountdownRenderer', () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    (global as any).WebSocket = jest.fn(() => mockWs);
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
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001');
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
      'Failed to parse message:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});

