import '@testing-library/jest-dom'

// Mock certificates module which uses ESM-only features (import.meta.url)
jest.mock('@/lib/config/certificates', () => ({
  PROJECT_ROOT: '/mock/project/root',
  CERT_FILENAME: 'localhost+4.pem',
  KEY_FILENAME: 'localhost+4-key.pem',
  CERT_PATH: '/mock/project/root/localhost+4.pem',
  KEY_PATH: '/mock/project/root/localhost+4-key.pem',
  CERT_HOSTNAMES: ['localhost', '127.0.0.1', '::1'],
  certificatesExist: jest.fn(() => false),
  generateCertificates: jest.fn(() => Promise.resolve(true)),
}))

// Mock environment variables
process.env.OBS_WEBSOCKET_URL = 'ws://localhost:4455'
process.env.OBS_WEBSOCKET_PASSWORD = 'test_password'
process.env.APP_PORT = '3000'
process.env.WEBSOCKET_PORT = '3003'

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
