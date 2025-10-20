import { spawn } from 'child_process';
import { execSync } from 'child_process';

/**
 * Development script with proper cleanup on exit
 * Ensures ports 3000, 3001, 3002 are cleaned up when dev stops
 */

const PORTS = [3000, 3001, 3002];
const isWindows = process.platform === 'win32';
let childProcesses = [];

// Cleanup function
function cleanup() {
  console.log('\n🧹 Cleaning up...');
  
  // Kill spawned processes
  childProcesses.forEach(proc => {
    try {
      if (isWindows) {
        execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: 'ignore' });
      } else {
        process.kill(-proc.pid); // Kill process group
      }
    } catch (error) {
      // Process might already be dead
    }
  });
  
  // Clean up ports
  for (const port of PORTS) {
    try {
      if (isWindows) {
        const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        const lines = output.trim().split('\n');
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            try {
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            } catch (e) {
              // Already dead
            }
          }
        }
      } else {
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      }
    } catch (error) {
      // No process on port
    }
  }
  
  console.log('✓ Cleanup complete');
}

// Handle exit signals
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

process.on('exit', () => {
  cleanup();
});

// Run cleanup before starting
console.log('🧹 Pre-start cleanup...');
cleanup();

console.log('\n🚀 Starting development servers...\n');

// Start concurrently
const concurrently = spawn(
  'pnpm',
  ['exec', 'concurrently', 'pnpm:dev:backend', 'pnpm:dev:frontend', '--names', 'BACKEND,NEXT', '--prefix-colors', 'blue,green', '--kill-others'],
  {
    stdio: 'inherit',
    shell: true,
    ...(isWindows ? {} : { detached: true })
  }
);

childProcesses.push(concurrently);

concurrently.on('exit', (code) => {
  cleanup();
  process.exit(code || 0);
});

