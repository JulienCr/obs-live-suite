#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const CWD = resolve('.');

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
  // `next dev` forces NODE_ENV=development in its own process, so there is
  // nothing to decouple on this path.
  childEnv.NODE_ENV = 'development';
  childEnv.TAILWIND_MODE = 'watch';
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
