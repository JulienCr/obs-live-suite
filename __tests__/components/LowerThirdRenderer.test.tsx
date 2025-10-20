/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { LowerThirdRenderer } from '@/components/overlays/LowerThirdRenderer';

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

describe('LowerThirdRenderer', () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    (global as any).WebSocket = jest.fn(() => mockWs);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should render nothing initially', () => {
    const { container } = render(<LowerThirdRenderer />);
    expect(container.firstChild).toBeNull();
  });

  it('should connect to WebSocket on mount', () => {
    render(<LowerThirdRenderer />);
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001');
  });

  it('should display lower third when show event is received', async () => {
    render(<LowerThirdRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
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
    render(<LowerThirdRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
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
      expect(mockWs.send).toHaveBeenCalledWith(
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
    render(<LowerThirdRenderer />);
    mockWs.simulateOpen();

    // Show first
    mockWs.simulateMessage({
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
    mockWs.simulateMessage({
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
    render(<LowerThirdRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
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
    render(<LowerThirdRenderer />);
    mockWs.simulateOpen();

    // Show first
    mockWs.simulateMessage({
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
    mockWs.simulateMessage({
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
    render(<LowerThirdRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
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
    render(<LowerThirdRenderer />);
    mockWs.simulateOpen();

    mockWs.simulateMessage({
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
    const { unmount } = render(<LowerThirdRenderer />);
    unmount();
    expect(mockWs.close).toHaveBeenCalled();
  });

  it('should clear timeout on unmount', async () => {
    const { unmount } = render(<LowerThirdRenderer />);
    mockWs.simulateOpen();

    await waitFor(() => {
      mockWs.simulateMessage({
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
    });

    // Wait for state updates
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    unmount();
    // Cleanup is called automatically, we just verify unmount doesn't throw
    expect(mockWs.close).toHaveBeenCalled();
  });
});

