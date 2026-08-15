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
// NODE_ENV drives the mode on both paths: server.js derives Next's `dev` flag
// from it, and `next start` refuses to run without a build.
//
// The absence of a build wins over the parent's NODE_ENV. PM2 sets it to
// production, so keeping it would send server.js into production mode with no
// BUILD_ID to serve - it exits immediately and PM2 restarts it until it gives
// up. Degrading to dev mode keeps the frontend reachable instead.
if (hasBuild) {
  childEnv.NODE_ENV = 'production';
} else {
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
