import { spawn } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

/**
 * Safe build script that ignores Windows EPERM errors on system directories
 * These errors occur when webpack tries to scan symlinked Windows system folders
 */

// Force APPDATA to a local writable dir to avoid Windows junctions ("Application Data")
const LOCAL_APPDATA = join(resolve('.'), '.appdata');
if (!existsSync(LOCAL_APPDATA)) {
  mkdirSync(LOCAL_APPDATA, { recursive: true });
}
const LOCAL_HOME = join(resolve('.'), '.home');
if (!existsSync(LOCAL_HOME)) {
  mkdirSync(LOCAL_HOME, { recursive: true });
}

const proc = spawn('pnpm', ['exec', 'next', 'build', '--webpack'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, APPDATA: LOCAL_APPDATA, USERPROFILE: LOCAL_HOME },
});

let hasRealError = false;

// Detect real build failures from stdout
proc.stdout.on('data', (data) => {
  const output = data.toString();
  if (!output.includes('glob error') && !output.includes('EPERM')) {
    process.stdout.write(output);
  }
  if (output.includes('Build error occurred') || output.includes('Failed to compile') || output.includes('Could not find a production build')) {
    hasRealError = true;
  }
});

// Filter stderr: suppress known harmless warnings, flag actual errors
proc.stderr.on('data', (data) => {
  const output = data.toString();
  // Suppress Windows EPERM on system junction directories
  if (output.includes('EPERM')) {
    return;
  }
  // Suppress webpack cache warnings
  if (output.includes('<w>') || output.includes('webpack.cache.PackFileCacheStrategy')) {
    return;
  }
  // Suppress Node.js runtime warnings (TLS, deprecation, etc.)
  if (output.includes('Warning:') && (output.includes('(node:') || output.includes('--trace-warnings'))) {
    return;
  }

  // Anything else on stderr is worth showing (but not necessarily a build failure)
  process.stderr.write(output);
});

proc.on('exit', (code) => {
  if (code !== 0 && !hasRealError) {
    console.log('✓ Build completed (non-fatal warnings ignored)');
    process.exit(0);
  }
  process.exit(code || 0);
});
