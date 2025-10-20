import { execSync } from 'child_process';

/**
 * Cleanup script to kill processes on development ports
 * Runs on Windows, macOS, and Linux
 */

const PORTS = [3000, 3001, 3002];
const isWindows = process.platform === 'win32';

function findProcessOnPort(port) {
  try {
    if (isWindows) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const pids = new Set();
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          pids.add(pid);
        }
      }
      
      return Array.from(pids);
    } else {
      // macOS/Linux
      const output = execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
      return output.trim().split('\n').filter(Boolean);
    }
  } catch (error) {
    // No process found on this port
    return [];
  }
}

function killProcess(pid) {
  try {
    if (isWindows) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }
    return true;
  } catch (error) {
    return false;
  }
}

function cleanup() {
  console.log('🧹 Cleaning up development ports...');
  
  let killedAny = false;
  
  for (const port of PORTS) {
    const pids = findProcessOnPort(port);
    
    if (pids.length > 0) {
      console.log(`📌 Port ${port}: Found ${pids.length} process(es)`);
      
      for (const pid of pids) {
        if (killProcess(pid)) {
          console.log(`   ✓ Killed process ${pid}`);
          killedAny = true;
        } else {
          console.log(`   ✗ Failed to kill process ${pid}`);
        }
      }
    }
  }
  
  if (!killedAny) {
    console.log('✓ All ports are clean');
  } else {
    console.log('✓ Cleanup complete');
  }
}

cleanup();

