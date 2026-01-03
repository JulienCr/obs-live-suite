/**
 * Deploy Stream Deck plugin to local installation
 *
 * Usage:
 *   node scripts/deploy.mjs           # Deploy only (Stream Deck must be stopped)
 *   node scripts/deploy.mjs --restart # Stop Stream Deck, deploy, restart
 */

import { execSync } from "child_process";
import { cpSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const PLUGIN_NAME = "com.julien-cruau.obslive-suite.sdPlugin";
const STREAMDECK_PLUGINS_PATH = join(
  process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
  "Elgato",
  "StreamDeck",
  "Plugins"
);

const SOURCE_PATH = join(process.cwd(), PLUGIN_NAME);
const DEST_PATH = join(STREAMDECK_PLUGINS_PATH, PLUGIN_NAME);

const shouldRestart = process.argv.includes("--restart");

function log(message) {
  console.log(`[Deploy] ${message}`);
}

function error(message) {
  console.error(`[Deploy] ERROR: ${message}`);
  process.exit(1);
}

function isStreamDeckRunning() {
  try {
    const result = execSync('tasklist /FI "IMAGENAME eq StreamDeck.exe" /NH', { encoding: "utf-8" });
    return result.includes("StreamDeck.exe");
  } catch {
    return false;
  }
}

function stopStreamDeck() {
  log("Stopping Stream Deck...");
  try {
    execSync('taskkill /IM "StreamDeck.exe" /F', { stdio: "ignore" });
    // Wait for process to fully stop
    let attempts = 0;
    while (isStreamDeckRunning() && attempts < 10) {
      execSync("timeout /t 1 /nobreak >nul", { shell: true, stdio: "ignore" });
      attempts++;
    }
    log("Stream Deck stopped");
  } catch {
    // Process might not be running
  }
}

function startStreamDeck() {
  log("Starting Stream Deck...");
  const streamDeckPath = join(
    process.env.PROGRAMFILES || "C:\\Program Files",
    "Elgato",
    "StreamDeck",
    "StreamDeck.exe"
  );

  if (existsSync(streamDeckPath)) {
    execSync(`start "" "${streamDeckPath}"`, { shell: true, stdio: "ignore" });
    log("Stream Deck started");
  } else {
    log("Stream Deck executable not found at default location. Please start manually.");
  }
}

function deploy() {
  // Check source exists
  if (!existsSync(SOURCE_PATH)) {
    error(`Source plugin not found: ${SOURCE_PATH}\nRun 'pnpm build' first.`);
  }

  // Check if Stream Deck is running (and we're not restarting)
  if (!shouldRestart && isStreamDeckRunning()) {
    error("Stream Deck is running. Use --restart flag or stop it manually.");
  }

  // Stop Stream Deck if restart flag is set
  if (shouldRestart && isStreamDeckRunning()) {
    stopStreamDeck();
  }

  // Remove old plugin
  if (existsSync(DEST_PATH)) {
    log(`Removing old plugin from ${DEST_PATH}`);
    rmSync(DEST_PATH, { recursive: true, force: true });
  }

  // Copy new plugin
  log(`Deploying to ${DEST_PATH}`);
  cpSync(SOURCE_PATH, DEST_PATH, { recursive: true });

  log("Plugin deployed successfully!");

  // Restart Stream Deck if flag is set
  if (shouldRestart) {
    startStreamDeck();
  } else {
    log("Start Stream Deck to use the plugin.");
  }
}

// Run
deploy();
