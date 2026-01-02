#!/usr/bin/env node
/**
 * HTTPS Setup Script for OBS Live Suite
 *
 * This script automates the setup of:
 * - mkcert SSL certificates for local HTTPS
 * - VDO.ninja static files for local hosting
 * - Environment configuration
 *
 * Usage: node scripts/setup-https.js [options]
 *   --skip-mkcert     Skip mkcert installation check
 *   --skip-vdoninja   Skip VDO.ninja download
 *   --ip <address>    Custom IP address (default: auto-detect)
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import {
  PROJECT_ROOT,
  CERT_PATH,
  KEY_PATH,
  CERT_HOSTNAMES,
} from '../lib/config/certificates.mjs';

const ROOT_DIR = PROJECT_ROOT;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.cyan}[${step}]${colors.reset} ${colors.bright}${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`  ${colors.green}✓${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`  ${colors.yellow}⚠${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`  ${colors.red}✗${colors.reset} ${message}`);
}

/**
 * Get local IP address (moved to main function)
 */

/**
 * Check if a command exists
 */
function commandExists(cmd) {
  try {
    execSync(`where ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync(`which ${cmd}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Check and install mkcert
 */
async function setupMkcert() {
  logStep('1/4', 'Checking mkcert installation...');

  if (commandExists('mkcert')) {
    logSuccess('mkcert is installed');
  } else {
    logWarning('mkcert is not installed');
    console.log('\n  Please install mkcert using one of these methods:');
    console.log('    - Chocolatey: choco install mkcert');
    console.log('    - Scoop: scoop install mkcert');
    console.log('    - Download: https://github.com/FiloSottile/mkcert/releases\n');

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('  Press Enter after installing mkcert, or type "skip" to continue without it: ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() === 'skip') {
      logWarning('Skipping mkcert setup - HTTPS will not work');
      return false;
    }

    if (!commandExists('mkcert')) {
      logError('mkcert still not found. Please install it and run this script again.');
      return false;
    }
  }

  return true;
}

/**
 * Generate SSL certificates
 */
async function generateCertificates(localIP) {
  logStep('2/4', 'Generating SSL certificates...');

  // Check if certificates already exist
  if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    logSuccess('SSL certificates already exist');

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('  Regenerate certificates? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      return true;
    }
  }

  try {
    // Install mkcert CA if not already done
    log('  Installing local CA (may require admin privileges)...');
    execSync('mkcert -install', { stdio: 'inherit', cwd: ROOT_DIR });
    logSuccess('Local CA installed');

    // Generate certificates using hostnames from centralized config
    log(`  Generating certificates for: ${CERT_HOSTNAMES.join(', ')}...`);
    execSync(`mkcert ${CERT_HOSTNAMES.join(' ')}`, {
      stdio: 'inherit',
      cwd: ROOT_DIR
    });
    logSuccess('SSL certificates generated');

    // Copy rootCA.pem to project for mobile installation
    log('  Copying root CA certificate to project...');
    const caRoot = execSync('mkcert -CAROOT', { encoding: 'utf-8' }).trim();
    const rootCaSrc = path.join(caRoot, 'rootCA.pem');
    const rootCaDest = path.join(ROOT_DIR, 'rootCA.pem');

    if (fs.existsSync(rootCaSrc)) {
      fs.copyFileSync(rootCaSrc, rootCaDest);
      logSuccess(`Root CA copied to ${rootCaDest}`);
    } else {
      logWarning(`Root CA not found at ${rootCaSrc}`);
    }

    return true;
  } catch (error) {
    logError(`Failed to generate certificates: ${error.message}`);
    return false;
  }
}

/**
 * Download and extract VDO.ninja
 */
async function downloadVdoNinja() {
  logStep('3/4', 'Setting up VDO.ninja...');

  const vdoDir = path.join(ROOT_DIR, 'server', 'static', 'vdoninja');
  const indexPath = path.join(vdoDir, 'index.html');

  // Check if VDO.ninja is already installed
  if (fs.existsSync(indexPath)) {
    logSuccess('VDO.ninja is already installed');
    return true;
  }

  // Create directory if it doesn't exist
  if (!fs.existsSync(vdoDir)) {
    fs.mkdirSync(vdoDir, { recursive: true });
  }

  log('  Downloading VDO.ninja from GitHub...');
  log('  This may take a minute...');

  const zipUrl = 'https://github.com/steveseguin/vdo.ninja/archive/refs/heads/main.zip';
  const zipPath = path.join(vdoDir, 'vdoninja.zip');

  try {
    // Download zip file
    await new Promise((resolve, reject) => {
      const file = createWriteStream(zipPath);

      const request = (url) => {
        https.get(url, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            // Follow redirect
            request(response.headers.location);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${response.statusCode}`));
            return;
          }

          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      };

      request(zipUrl);
    });

    logSuccess('Downloaded VDO.ninja zip file');

    // Extract zip file
    log('  Extracting files...');

    // Use PowerShell to extract on Windows
    const extractCmd = process.platform === 'win32'
      ? `powershell -Command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${vdoDir}'"`
      : `unzip -o "${zipPath}" -d "${vdoDir}"`;

    execSync(extractCmd, { stdio: 'ignore' });

    // Move files from subdirectory to main directory
    const extractedDir = path.join(vdoDir, 'vdo.ninja-main');
    if (fs.existsSync(extractedDir)) {
      const files = fs.readdirSync(extractedDir);
      for (const file of files) {
        const srcPath = path.join(extractedDir, file);
        const destPath = path.join(vdoDir, file);

        // Skip if destination already exists
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { recursive: true, force: true });
        }

        fs.renameSync(srcPath, destPath);
      }
      fs.rmdirSync(extractedDir, { recursive: true });
    }

    // Clean up zip file
    fs.unlinkSync(zipPath);

    logSuccess('VDO.ninja extracted successfully');
    return true;

  } catch (error) {
    logError(`Failed to download VDO.ninja: ${error.message}`);
    console.log('\n  Manual installation:');
    console.log('    1. Download: https://github.com/steveseguin/vdo.ninja/archive/refs/heads/main.zip');
    console.log(`    2. Extract to: ${vdoDir}`);
    return false;
  }
}

/**
 * Update environment configuration
 */
async function updateEnvConfig(localIP) {
  logStep('4/4', 'Updating environment configuration...');

  const envPath = path.join(ROOT_DIR, '.env');
  const envExamplePath = path.join(ROOT_DIR, '.env.local.example');

  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      logSuccess('Created .env from .env.local.example');
    } else {
      logWarning('.env file not found');
      return false;
    }
  }

  // Read current .env
  let envContent = fs.readFileSync(envPath, 'utf-8');

  // Update HTTPS-related variables
  const updates = [
    { key: 'BACKEND_URL', value: 'https://localhost:3002' },
    { key: 'NEXT_PUBLIC_BACKEND_URL', value: 'https://localhost:3002' },
    { key: 'NODE_TLS_REJECT_UNAUTHORIZED', value: '0' },
  ];

  for (const { key, value } of updates) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else if (!envContent.includes(`${key}=`)) {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent);
  logSuccess('Environment variables configured');

  return true;
}

/**
 * Print summary
 */
function printSummary(localIP, success) {
  console.log('\n' + '='.repeat(60));

  if (success) {
    log('\n✅ HTTPS Setup Complete!\n', colors.green + colors.bright);

    console.log('Start the application:');
    console.log(`  ${colors.cyan}pnpm dev${colors.reset}\n`);

    console.log('Access URLs:');
    console.log(`  Local:   ${colors.cyan}https://localhost:3000${colors.reset}`);
    console.log(`  Network: ${colors.cyan}https://${localIP}:3000${colors.reset}\n`);

    console.log('VDO.ninja local URLs:');
    console.log(`  Local:   ${colors.cyan}https://localhost:3002/vdoninja/${colors.reset}`);
    console.log(`  Network: ${colors.cyan}https://${localIP}:3002/vdoninja/${colors.reset}\n`);

    console.log('Example VDO.ninja URL for Room Settings:');
    console.log(`  ${colors.cyan}https://${localIP}:3002/vdoninja/?view=YOUR_STREAM_ID&solo&room=YOUR_ROOM${colors.reset}\n`);

    console.log('For other devices on your network:');
    console.log('  1. Export the mkcert CA certificate:');
    console.log(`     ${colors.yellow}mkcert -CAROOT${colors.reset}  (shows CA location)`);
    console.log('  2. Copy rootCA.pem to other devices and install it');
    console.log('  3. Or just accept the certificate warning in the browser\n');
  } else {
    log('\n⚠️  Setup completed with warnings\n', colors.yellow + colors.bright);
    console.log('Some steps may need to be completed manually.');
    console.log('See docs/VDONINJA-SETUP.md for detailed instructions.\n');
  }

  console.log('='.repeat(60));
}

/**
 * Main setup function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  log('  OBS Live Suite - HTTPS Setup', colors.bright + colors.cyan);
  console.log('='.repeat(60));

  // Parse arguments
  const args = process.argv.slice(2);
  const skipMkcert = args.includes('--skip-mkcert');
  const skipVdoNinja = args.includes('--skip-vdoninja');
  const ipIndex = args.indexOf('--ip');

  // Get local IP
  const os = await import('os');
  const nets = os.networkInterfaces();
  let localIP = null;

  if (ipIndex !== -1 && args[ipIndex + 1]) {
    localIP = args[ipIndex + 1];
  } else {
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          if (net.address.startsWith('192.168.') ||
              net.address.startsWith('10.') ||
              net.address.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
            localIP = net.address;
            break;
          }
        }
      }
      if (localIP) break;
    }
  }

  localIP = localIP || '192.168.1.10';
  log(`\n  Detected local IP: ${localIP}`, colors.yellow);

  let success = true;

  // Step 1: Check mkcert
  if (!skipMkcert) {
    const mkcertOk = await setupMkcert();
    if (!mkcertOk) success = false;

    // Step 2: Generate certificates
    if (mkcertOk) {
      const certOk = await generateCertificates(localIP);
      if (!certOk) success = false;
    }
  } else {
    logWarning('Skipping mkcert check');
  }

  // Step 3: Download VDO.ninja
  if (!skipVdoNinja) {
    const vdoOk = await downloadVdoNinja();
    if (!vdoOk) success = false;
  } else {
    logWarning('Skipping VDO.ninja download');
  }

  // Step 4: Update environment
  const envOk = await updateEnvConfig(localIP);
  if (!envOk) success = false;

  // Print summary
  printSummary(localIP, success);
}

// Run main function
main().catch(error => {
  logError(`Setup failed: ${error.message}`);
  process.exit(1);
});
