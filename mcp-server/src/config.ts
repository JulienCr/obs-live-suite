import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.resolve(projectRoot, '.env') });

function detectHttps(): boolean {
  if (process.env.USE_HTTPS !== undefined) {
    return process.env.USE_HTTPS === 'true';
  }
  const certPath = path.join(projectRoot, 'localhost+4.pem');
  const keyPath = path.join(projectRoot, 'localhost+4-key.pem');
  return fs.existsSync(certPath) && fs.existsSync(keyPath);
}

const protocol = detectHttps() ? 'https' : 'http';

export const MCP_SERVER_NAME = 'obs-live-suite';
export const MCP_SERVER_VERSION = '0.1.0';
export const MCP_PORT = parseInt(process.env.MCP_PORT || '3004', 10);
export const MCP_HOST = process.env.MCP_HOST || '0.0.0.0';
// Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues
// (Node 22 resolves localhost to ::1 but servers may only listen on IPv4)
export const BACKEND_URL = process.env.BACKEND_URL || `${protocol}://127.0.0.1:${process.env.BACKEND_PORT || '3002'}`;
export const FRONTEND_URL = process.env.FRONTEND_URL || `${protocol}://127.0.0.1:${process.env.APP_PORT || '3000'}`;
