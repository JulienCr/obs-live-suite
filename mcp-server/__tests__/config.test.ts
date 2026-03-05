jest.mock('dotenv', () => ({ config: jest.fn(), default: { config: jest.fn() } }));
jest.mock('url', () => ({ fileURLToPath: jest.fn(() => '/fake/mcp-server/src/config.ts') }));
jest.mock('fs');

import fs from 'fs';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});

function importConfig() {
  let config: Record<string, unknown>;
  jest.isolateModules(() => {
    config = require('../src/config');
  });
  return config!;
}

describe('config', () => {
  test('cert files exist → https URLs', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    delete process.env.USE_HTTPS;
    delete process.env.BACKEND_URL;
    delete process.env.FRONTEND_URL;

    const config = importConfig();

    expect(config.BACKEND_URL).toMatch(/^https:\/\//);
    expect(config.FRONTEND_URL).toMatch(/^https:\/\//);
  });

  test('cert files missing → http URLs', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    delete process.env.USE_HTTPS;
    delete process.env.BACKEND_URL;
    delete process.env.FRONTEND_URL;

    const config = importConfig();

    expect(config.BACKEND_URL).toMatch(/^http:\/\//);
    expect(config.FRONTEND_URL).toMatch(/^http:\/\//);
  });

  test('USE_HTTPS=true overrides missing certs', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    process.env.USE_HTTPS = 'true';
    delete process.env.BACKEND_URL;
    delete process.env.FRONTEND_URL;

    const config = importConfig();

    expect(config.BACKEND_URL).toMatch(/^https:\/\//);
    expect(config.FRONTEND_URL).toMatch(/^https:\/\//);
  });

  test('USE_HTTPS=false overrides existing certs', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    process.env.USE_HTTPS = 'false';
    delete process.env.BACKEND_URL;
    delete process.env.FRONTEND_URL;

    const config = importConfig();

    expect(config.BACKEND_URL).toMatch(/^http:\/\//);
    expect(config.FRONTEND_URL).toMatch(/^http:\/\//);
  });

  test('MCP_PORT env override', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    process.env.MCP_PORT = '9999';

    const config = importConfig();

    expect(config.MCP_PORT).toBe(9999);
  });

  test('BACKEND_URL and FRONTEND_URL env overrides', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    process.env.BACKEND_URL = 'http://custom:1234';
    process.env.FRONTEND_URL = 'http://custom:5678';

    const config = importConfig();

    expect(config.BACKEND_URL).toBe('http://custom:1234');
    expect(config.FRONTEND_URL).toBe('http://custom:5678');
  });

  test('default values when no env vars and no certs', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    delete process.env.USE_HTTPS;
    delete process.env.MCP_PORT;
    delete process.env.MCP_HOST;
    delete process.env.BACKEND_URL;
    delete process.env.FRONTEND_URL;
    delete process.env.BACKEND_PORT;
    delete process.env.APP_PORT;

    const config = importConfig();

    expect(config.MCP_SERVER_NAME).toBe('obs-live-suite');
    expect(config.MCP_SERVER_VERSION).toBe('0.1.0');
    expect(config.MCP_PORT).toBe(3004);
    expect(config.MCP_HOST).toBe('0.0.0.0');
    expect(config.BACKEND_URL).toBe('http://localhost:3002');
    expect(config.FRONTEND_URL).toBe('http://localhost:3000');
  });
});
