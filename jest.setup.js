import '@testing-library/jest-dom'

// Mock environment variables
process.env.OBS_WEBSOCKET_URL = 'ws://localhost:4455'
process.env.OBS_WEBSOCKET_PASSWORD = 'test_password'
process.env.APP_PORT = '3000'
process.env.WEBSOCKET_PORT = '3001'

// Suppress act() warnings in tests
// These are expected in async component tests and don't affect functionality
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: An update to') &&
      args[0].includes('was not wrapped in act')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

