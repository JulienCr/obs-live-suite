/**
 * Shared Test Utilities
 *
 * Central export point for test utilities used across the test suite.
 */

// WebSocket mocking utilities
export {
  MockWebSocket,
  WebSocketReadyState,
  setupWebSocketMock,
  getLastMockWebSocket,
  getAllMockWebSockets,
  createWebSocketTestHarness,
  type WebSocketReadyStateValue,
  type WebSocketEventHandlers,
  type MockWebSocketMessage,
} from './websocket-mock';
