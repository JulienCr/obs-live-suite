#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { homedir, platform } from 'os';
import { join, resolve } from 'path';

const CWD = resolve('.');

/**
 * The production data directory, mirroring getDefaultDataDir() in
 * lib/config/AppConfig.ts. Duplicated rather than imported because this launcher
 * runs as plain Node, with no TypeScript loader — keep the two in step.
 */
function productionDataDir() {
  switch (platform()) {
    case 'win32':
      return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'obs-live-suite');
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', 'obs-live-suite');
    default:
      return join(homedir(), '.config', 'obs-live-suite');
  }
}

// Certificate paths (same as lib/config/certificates.ts)
const CERT_PATH = resolve(CWD, 'localhost+4.pem');
const KEY_PATH = resolve(CWD, 'localhost+4-key.pem');

const hasBuild = existsSync(resolve(CWD, '.next', 'BUILD_ID'));
const hasHttpsCerts = existsSync(CERT_PATH) && existsSync(KEY_PATH);

const cmd = 'node';
let args;

if (hasHttpsCerts) {
  // Use custom HTTPS server
  args = [resolve(CWD, 'server.js')];
  console.log('[frontend] Starting with HTTPS server (server.js)');
} else {
  // Fallback to standard Next.js
  args = [
    resolve(CWD, 'node_modules', 'next', 'dist', 'bin', 'next'),
    hasBuild ? 'start' : 'dev',
    '-p',
    process.env.PORT || '3000',
  ];
  console.warn('[frontend] No HTTPS certificates found. Using standard Next.js server.');
}

if (!hasBuild) {
  console.warn('[frontend] No .next/BUILD_ID found. Falling back to dev mode to avoid PM2 restart loop.');
}

const childEnv = { ...process.env };
// Without a build, server.js would boot in production mode, find no BUILD_ID and
// exit - PM2 then restarts it until it gives up. Degrading to dev mode keeps the
// frontend reachable instead.
//
// NEXT_DEV rather than NODE_ENV on the HTTPS path, because NODE_ENV also selects
// storage: AppConfig sends a non-production process to .appdata/obs-live-suite.
// Flipping it here would leave the frontend reading a different database and
// uploads directory than the backend, which PM2 keeps in production - assets
// created by the backend would 404 on the frontend. Only Next's dev flag moves.
if (hasBuild) {
  childEnv.NODE_ENV = 'production';
} else if (hasHttpsCerts) {
  childEnv.NEXT_DEV = 'true';
  childEnv.TAILWIND_MODE = 'watch';
} else {
  // `next dev` forces NODE_ENV=development inside its own process, so NEXT_DEV
  // cannot protect this path: AppConfig runs there and would pick the dev data
  // directory. Pin the storage explicitly instead, so the frontend keeps reading
  // the database and uploads the production backend is writing. An override
  // already present in the environment wins.
  childEnv.NODE_ENV = 'development';
  childEnv.TAILWIND_MODE = 'watch';
  const dataDir = productionDataDir();
  childEnv.DATA_DIR ??= dataDir;
  childEnv.DATABASE_PATH ??= join(dataDir, 'data.db');
  childEnv.LOG_FILE ??= join(dataDir, 'logs', 'app.log');
}

// Set APP_PORT for server.js
childEnv.APP_PORT = process.env.PORT || '3000';

// windowsHide: under PM2 this process has no console to inherit, so spawning
// node without it makes Windows allocate a new one - a stray terminal window.
const child = spawn(cmd, args, {
  cwd: CWD,
  stdio: 'inherit',
  env: childEnv,
  windowsHide: true,
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
