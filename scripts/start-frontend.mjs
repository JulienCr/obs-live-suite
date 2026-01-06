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

if (!hasBuild && !hasHttpsCerts) {
  console.warn('[frontend] No .next/BUILD_ID found. Falling back to `next dev` to avoid PM2 restart loop.');
}

const childEnv = { ...process.env };
if (hasBuild) {
  childEnv.NODE_ENV = 'production';
} else {
  childEnv.NODE_ENV = 'development';
  childEnv.TAILWIND_MODE = 'watch';
}

// Set APP_PORT for server.js
childEnv.APP_PORT = process.env.PORT || '3000';

const child = spawn(cmd, args, {
  cwd: CWD,
  stdio: 'inherit',
  env: childEnv,
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
