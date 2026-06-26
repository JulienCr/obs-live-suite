#!/usr/bin/env node
/**
 * Provision (or renew) the Tailscale Let's Encrypt certificate used to serve the
 * app over Tailscale with a trusted cert — NO custom CA on remote devices.
 *
 * What it does:
 *   1. Resolves the tailscale CLI (PATH, then the default Windows install path).
 *   2. Detects this machine's MagicDNS name (Self.DNSName) — override with --fqdn.
 *   3. Runs `tailscale cert` and writes tailscale.crt / tailscale.key to the
 *      project root (paths come from lib/config/tlsContext.mjs — single source).
 *
 * The running servers pick up the new cert automatically (SNICallback reloads on
 * file change), so no restart is needed after a renewal.
 *
 * Renewal: Let's Encrypt certs last 90 days. `tailscale cert` is idempotent and
 * only renews when the cached cert is near expiry, so it is safe to run on a
 * weekly schedule (e.g. a Windows Scheduled Task) or by hand:
 *
 *     pnpm cert:tailscale
 *
 * Requires "HTTPS Certificates" + MagicDNS enabled in the tailnet admin console:
 *     https://login.tailscale.com/admin/dns
 *
 * Usage:
 *   node scripts/setup-tailscale-cert.mjs [--fqdn <name.tailnet.ts.net>]
 */

import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { TAILSCALE_CERT_PATH, TAILSCALE_KEY_PATH } from "../lib/config/tlsContext.mjs";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function ok(msg) {
  console.log(`  ${colors.green}✓${colors.reset} ${msg}`);
}
function err(msg) {
  console.log(`  ${colors.red}✗${colors.reset} ${msg}`);
}

/** Locate the tailscale CLI: PATH first, then the default Windows install path. */
function resolveTailscaleBin() {
  const candidates = ["tailscale", "C:\\Program Files\\Tailscale\\tailscale.exe"];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ["version"], { stdio: "ignore" });
      return bin;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/** Read this machine's MagicDNS name from `tailscale status --json`. */
function detectFqdn(bin) {
  const raw = execFileSync(bin, ["status", "--json"], { encoding: "utf-8" });
  const status = JSON.parse(raw);
  const dnsName = status?.Self?.DNSName;
  if (!dnsName) return null;
  return dnsName.replace(/\.$/, ""); // strip trailing dot
}

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function main() {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${colors.bright}${colors.cyan}OBS Live Suite - Tailscale certificate${colors.reset}`);
  console.log("=".repeat(60) + "\n");

  const bin = resolveTailscaleBin();
  if (!bin) {
    err("tailscale CLI not found.");
    console.log("    Install Tailscale: https://tailscale.com/download");
    process.exit(1);
  }
  ok(`tailscale CLI: ${bin}`);

  let fqdn = getArg("--fqdn");
  if (!fqdn) {
    try {
      fqdn = detectFqdn(bin);
    } catch (e) {
      err(`Could not read tailscale status: ${e.message}`);
      console.log("    Is Tailscale running and logged in? Try: tailscale up");
      process.exit(1);
    }
  }
  if (!fqdn) {
    err("Could not determine the MagicDNS name.");
    console.log("    Pass it explicitly: node scripts/setup-tailscale-cert.mjs --fqdn <name>.ts.net");
    console.log("    (Enable MagicDNS in the admin console: https://login.tailscale.com/admin/dns)");
    process.exit(1);
  }
  ok(`MagicDNS name: ${fqdn}`);

  console.log(`\n  Requesting certificate for ${colors.bright}${fqdn}${colors.reset} ...`);
  try {
    execFileSync(
      bin,
      ["cert", "--cert-file", TAILSCALE_CERT_PATH, "--key-file", TAILSCALE_KEY_PATH, fqdn],
      { stdio: "inherit" }
    );
  } catch (e) {
    err(`tailscale cert failed: ${e.message}`);
    console.log("\n  Most common cause: HTTPS Certificates not enabled for the tailnet.");
    console.log(`  Enable it here: ${colors.cyan}https://login.tailscale.com/admin/dns${colors.reset}`);
    console.log("    → turn on MagicDNS, then turn on HTTPS Certificates, then re-run this.\n");
    process.exit(1);
  }

  if (!existsSync(TAILSCALE_CERT_PATH) || !existsSync(TAILSCALE_KEY_PATH)) {
    err("Certificate command succeeded but files are missing — unexpected.");
    process.exit(1);
  }

  console.log("");
  ok(`Wrote ${TAILSCALE_CERT_PATH}`);
  ok(`Wrote ${TAILSCALE_KEY_PATH}`);

  console.log("\n" + "=".repeat(60));
  console.log(`\n${colors.green}${colors.bright}✅ Tailscale certificate ready${colors.reset}\n`);
  console.log("Access the app from any tailnet device (trusted, no CA install):");
  console.log(`  ${colors.cyan}https://${fqdn}:3000${colors.reset}\n`);
  console.log("Renewal: re-run anytime (idempotent); schedule weekly to stay fresh.");
  console.log(`  ${colors.cyan}pnpm cert:tailscale${colors.reset}\n`);
  console.log("=".repeat(60));
}

main();
