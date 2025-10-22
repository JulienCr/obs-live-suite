#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const CWD = resolve('.');
const hasBuild = existsSync(resolve(CWD, '.next', 'BUILD_ID'));

const cmd = process.platform === 'win32' ? 'node' : 'node';
const args = [
  resolve(CWD, 'node_modules', 'next', 'dist', 'bin', 'next'),
  hasBuild ? 'start' : 'dev',
  '-p',
  process.env.PORT || '3000',
];

if (!hasBuild) {
  console.warn('[frontend] No .next/BUILD_ID found. Falling back to `next dev` to avoid PM2 restart loop.');
}

const childEnv = { ...process.env };
if (hasBuild) {
  childEnv.NODE_ENV = 'production';
} else {
  childEnv.NODE_ENV = 'development';
  childEnv.TAILWIND_MODE = 'watch';
}

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
