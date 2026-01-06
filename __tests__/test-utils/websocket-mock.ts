/**
 * Shared WebSocket Mock Utility for Tests
 *
 * Provides a properly typed MockWebSocket class and setup utilities
 * to avoid duplicated mock code across test files.
 *
 * @example
 * ```typescript
 * import { setupWebSocketMock, getLastMockWebSocket } from '@/__tests__/test-utils/websocket-mock';
 *
 * describe('MyComponent', () => {
 *   let cleanup: () => void;
 *
 *   beforeEach(() => {
 *     cleanup = setupWebSocketMock();
 *   });
 *
 *   afterEach(() => {
 *     cleanup();
 *   });
 *
 *   it('should handle WebSocket messages', () => {
 *     render(<MyComponent />);
 *     const mockWs = getLastMockWebSocket();
 *     mockWs.simulateOpen();
 *     mockWs.simulateMessage({ type: 'event', data: {} });
 *   });
 * });
 * ```
 */

// WebSocket ready state constants
export const WebSocketReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export type WebSocketReadyStateValue =
  (typeof WebSocketReadyState)[keyof typeof WebSocketReadyState];

/**
 * Type for WebSocket event handlers
 */
export interface WebSocketEventHandlers {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
}

/**
 * Type for messages sent through MockWebSocket
 */
export interface MockWebSocketMessage {
  channel?: string;
  type?: string;
  data?: unknown;
  payload?: unknown;
  id?: string;
  [key: string]: unknown;
}

/**
 * Mock WebSocket implementation for testing
 *
 * Provides all standard WebSocket properties and methods,
 * plus helper methods to simulate server events.
 */
export class MockWebSocket implements WebSocketEventHandlers {
  // Event handlers
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  // WebSocket state
  readyState: WebSocketReadyStateValue = WebSocketReadyState.CONNECTING;
  url: string;
  protocol = '';
  extensions = '';
  bufferedAmount = 0;
  binaryType: BinaryType = 'blob';

  // Static constants (matching native WebSocket)
  static readonly CONNECTING = WebSocketReadyState.CONNECTING;
  static readonly OPEN = WebSocketReadyState.OPEN;
  static readonly CLOSING = WebSocketReadyState.CLOSING;
  static readonly CLOSED = WebSocketReadyState.CLOSED;

  // Instance constants (for compatibility)
  readonly CONNECTING = WebSocketReadyState.CONNECTING;
  readonly OPEN = WebSocketReadyState.OPEN;
  readonly CLOSING = WebSocketReadyState.CLOSING;
  readonly CLOSED = WebSocketReadyState.CLOSED;

  // Jest mock functions for verification
  send: jest.Mock<void, [string | ArrayBufferLike | Blob | ArrayBufferView]>;
  close: jest.Mock<void, [number?, string?]>;

  // Event listener storage for addEventListener/removeEventListener
  private eventListeners: Map<string, Set<EventListenerOrEventListenerObject>> =
    new Map();

  // Track all instances for getInstance pattern
  private static instances: MockWebSocket[] = [];

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    if (protocols) {
      this.protocol = Array.isArray(protocols) ? protocols[0] : protocols;
    }

    // Initialize mock functions
    this.send = jest.fn();
    this.close = jest.fn((code?: number, reason?: string) => {
      this.readyState = WebSocketReadyState.CLOSED;
      this.triggerClose(code ?? 1000, reason ?? '');
    });

    // Track instance
    MockWebSocket.instances.push(this);
  }

  /**
   * Add an event listener
   */
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject
  ): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  /**
   * Dispatch an event to listeners
   */
  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        if (typeof listener === 'function') {
          listener(event);
        } else {
          listener.handleEvent(event);
        }
      });
    }
    return true;
  }

  // ============================================
  // Helper Methods for Test Simulation
  // ============================================

  /**
   * Simulate the WebSocket connection opening
   */
  simulateOpen(): void {
    this.readyState = WebSocketReadyState.OPEN;
    const event = new Event('open');

    // Call direct handler
    if (this.onopen) {
      this.onopen(event);
    }

    // Dispatch to listeners
    this.dispatchEvent(event);
  }

  /**
   * Simulate receiving a message from the server
   *
   * @param data - The message data (will be JSON.stringify'd if object)
   */
  simulateMessage(data: MockWebSocketMessage | string): void {
    const messageData = typeof data === 'string' ? data : JSON.stringify(data);
    const event = new MessageEvent('message', { data: messageData });

    // Call direct handler
    if (this.onmessage) {
      this.onmessage(event);
    }

    // Dispatch to listeners
    this.dispatchEvent(event);
  }

  /**
   * Simulate a raw message (no JSON stringify)
   *
   * @param data - The raw message data string
   */
  simulateRawMessage(data: string): void {
    const event = new MessageEvent('message', { data });

    if (this.onmessage) {
      this.onmessage(event);
    }

    this.dispatchEvent(event);
  }

  /**
   * Simulate a WebSocket error
   *
   * @param errorMessage - Optional error message
   */
  simulateError(errorMessage?: string): void {
    const event = new Event('error');
    // Add error property for debugging (non-standard but useful)
    (event as Event & { message?: string }).message = errorMessage;

    if (this.onerror) {
      this.onerror(event);
    }

    this.dispatchEvent(event);
  }

  /**
   * Simulate the WebSocket connection closing
   *
   * @param code - Close code (default: 1000 for normal closure)
   * @param reason - Close reason
   */
  simulateClose(code = 1000, reason = ''): void {
    this.readyState = WebSocketReadyState.CLOSED;
    this.triggerClose(code, reason);
  }

  /**
   * Internal method to trigger close event
   */
  private triggerClose(code: number, reason: string): void {
    const event = new CloseEvent('close', {
      code,
      reason,
      wasClean: code === 1000,
    });

    if (this.onclose) {
      this.onclose(event);
    }

    this.dispatchEvent(event);
  }

  /**
   * Get the last message sent through this WebSocket
   *
   * @returns Parsed JSON object or null if no messages sent
   */
  getLastSentMessage<T = MockWebSocketMessage>(): T | null {
    const calls = this.send.mock.calls;
    if (calls.length === 0) return null;

    const lastCall = calls[calls.length - 1][0];
    if (typeof lastCall === 'string') {
      try {
        return JSON.parse(lastCall) as T;
      } catch {
        return lastCall as unknown as T;
      }
    }
    return null;
  }

  /**
   * Get all messages sent through this WebSocket
   *
   * @returns Array of parsed JSON objects
   */
  getAllSentMessages<T = MockWebSocketMessage>(): T[] {
    return this.send.mock.calls.map((call) => {
      const data = call[0];
      if (typeof data === 'string') {
        try {
          return JSON.parse(data) as T;
        } catch {
          return data as unknown as T;
        }
      }
      return data as unknown as T;
    });
  }

  /**
   * Reset the mock (clear call history)
   */
  reset(): void {
    this.send.mockClear();
    this.close.mockClear();
    this.readyState = WebSocketReadyState.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this.eventListeners.clear();
  }

  // ============================================
  // Static Methods for Instance Management
  // ============================================

  /**
   * Get the last created MockWebSocket instance
   */
  static getLastInstance(): MockWebSocket | null {
    return MockWebSocket.instances.length > 0
      ? MockWebSocket.instances[MockWebSocket.instances.length - 1]
      : null;
  }

  /**
   * Get all created MockWebSocket instances
   */
  static getAllInstances(): MockWebSocket[] {
    return [...MockWebSocket.instances];
  }

  /**
   * Clear all tracked instances
   */
  static clearInstances(): void {
    MockWebSocket.instances = [];
  }
}

// ============================================
// Global Types for Window/Global Augmentation
// ============================================

/**
 * Extended global type to include properly typed WebSocket mock
 */
interface MockWebSocketConstructor {
  new (url: string, protocols?: string | string[]): MockWebSocket;
  readonly CONNECTING: 0;
  readonly OPEN: 1;
  readonly CLOSING: 2;
  readonly CLOSED: 3;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      WebSocket: MockWebSocketConstructor;
    }
  }
  // For window in jsdom environment
  interface Window {
    WebSocket: MockWebSocketConstructor;
  }
}

// ============================================
// Setup Helpers
// ============================================

/**
 * Original WebSocket reference (saved for restoration)
 */
let originalWebSocket: typeof WebSocket | undefined;

/**
 * Setup WebSocket mock on the global object
 *
 * @returns Cleanup function to restore original WebSocket
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   const cleanup = setupWebSocketMock();
 *   // Store cleanup for afterEach
 * });
 * ```
 */
export function setupWebSocketMock(): () => void {
  // Save original
  originalWebSocket =
    typeof global !== 'undefined'
      ? (global as unknown as { WebSocket?: typeof WebSocket }).WebSocket
      : undefined;

  // Clear any previous instances
  MockWebSocket.clearInstances();

  // Create constructor that tracks instances
  const MockWebSocketConstructor = MockWebSocket as unknown as MockWebSocketConstructor;

  // Assign to global with proper typing
  (global as unknown as { WebSocket: MockWebSocketConstructor }).WebSocket =
    MockWebSocketConstructor;

  // Return cleanup function
  return () => {
    if (originalWebSocket !== undefined) {
      (global as unknown as { WebSocket: typeof WebSocket }).WebSocket =
        originalWebSocket;
    } else {
      delete (global as unknown as { WebSocket?: unknown }).WebSocket;
    }
    MockWebSocket.clearInstances();
  };
}

/**
 * Get the last created MockWebSocket instance
 *
 * Useful for accessing the WebSocket created by a component under test.
 *
 * @returns The last MockWebSocket instance or null if none created
 *
 * @example
 * ```typescript
 * render(<MyComponent />);
 * const ws = getLastMockWebSocket();
 * ws.simulateOpen();
 * ws.simulateMessage({ type: 'data', payload: {} });
 * ```
 */
export function getLastMockWebSocket(): MockWebSocket | null {
  return MockWebSocket.getLastInstance();
}

/**
 * Get all created MockWebSocket instances
 *
 * @returns Array of all MockWebSocket instances created since setup
 */
export function getAllMockWebSockets(): MockWebSocket[] {
  return MockWebSocket.getAllInstances();
}

/**
 * Create a preconfigured WebSocket mock setup for common test patterns
 *
 * @returns Object with setup, cleanup, and instance access methods
 *
 * @example
 * ```typescript
 * describe('MyComponent', () => {
 *   const wsMock = createWebSocketTestHarness();
 *
 *   beforeEach(() => wsMock.setup());
 *   afterEach(() => wsMock.cleanup());
 *
 *   it('handles messages', () => {
 *     render(<MyComponent />);
 *     const ws = wsMock.getInstance();
 *     ws.simulateOpen();
 *     ws.simulateMessage({ type: 'event' });
 *   });
 * });
 * ```
 */
export function createWebSocketTestHarness() {
  let cleanupFn: (() => void) | null = null;

  return {
    /**
     * Setup the WebSocket mock (call in beforeEach)
     */
    setup(): void {
      cleanupFn = setupWebSocketMock();
    },

    /**
     * Cleanup the WebSocket mock (call in afterEach)
     */
    cleanup(): void {
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
      jest.clearAllMocks();
    },

    /**
     * Get the last created WebSocket instance
     */
    getInstance(): MockWebSocket | null {
      return getLastMockWebSocket();
    },

    /**
     * Get all created WebSocket instances
     */
    getAllInstances(): MockWebSocket[] {
      return getAllMockWebSockets();
    },

    /**
     * Assert that WebSocket was created with specific URL
     */
    assertConnectedTo(expectedUrl: string): void {
      const instance = getLastMockWebSocket();
      expect(instance).not.toBeNull();
      expect(instance?.url).toBe(expectedUrl);
    },

    /**
     * Simulate opening the last WebSocket connection
     */
    open(): void {
      getLastMockWebSocket()?.simulateOpen();
    },

    /**
     * Simulate receiving a message on the last WebSocket
     */
    receiveMessage(data: MockWebSocketMessage | string): void {
      getLastMockWebSocket()?.simulateMessage(data);
    },

    /**
     * Get the last message sent through the WebSocket
     */
    getLastSentMessage<T = MockWebSocketMessage>(): T | null {
      return getLastMockWebSocket()?.getLastSentMessage<T>() ?? null;
    },
  };
}
