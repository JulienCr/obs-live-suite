/**
 * Shared TLS context builder with SNI (Server Name Indication) support.
 *
 * This is the SINGLE SOURCE OF TRUTH for how every HTTPS server in the app
 * (frontend `server.js`, backend Express, WebSocket hub) selects its
 * certificate, so the behavior is identical across all three ports.
 *
 * Why it lives in a plain `.mjs`:
 *   - `server.js` runs under plain `node` and cannot import the TypeScript
 *     `CertificateManager.ts` at runtime.
 *   - `CertificateManager.ts` (run by tsx / bundled only into the backend) can
 *     import this `.mjs` directly (allowJs + bundler resolution).
 *
 * Cert selection:
 *   - Tailscale MagicDNS names (`*.ts.net`) are served the publicly-trusted
 *     Let's Encrypt certificate provisioned by `tailscale cert`
 *     (see scripts/setup-tailscale-cert.mjs). This means remote tailnet devices
 *     get a green padlock with NO custom CA installed.
 *   - Every other name (localhost, edison, LAN IP) and raw-IP connections
 *     (which send no SNI) fall back to the local mkcert certificate, exactly as
 *     before.
 *
 * Secure contexts are cached and transparently reloaded when the underlying
 * cert files change on disk (mtime/size check), so a `tailscale cert` renewal
 * is picked up live WITHOUT restarting any server.
 */

import fs from "fs";
import tls from "tls";
import path from "path";
import { fileURLToPath } from "url";

// Project root is 2 levels up from lib/config/ (mirrors lib/config/certificates.ts)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

// mkcert files (kept in sync with lib/config/certificates.ts)
export const MKCERT_CERT_PATH = path.join(PROJECT_ROOT, "localhost+4.pem");
export const MKCERT_KEY_PATH = path.join(PROJECT_ROOT, "localhost+4-key.pem");

// Tailscale-issued (Let's Encrypt) files, produced by `tailscale cert`
export const TAILSCALE_CERT_PATH = path.join(PROJECT_ROOT, "tailscale.crt");
export const TAILSCALE_KEY_PATH = path.join(PROJECT_ROOT, "tailscale.key");

/**
 * Build a lazy, mtime-cached loader for a cert/key pair.
 * Returns a function that yields a tls.SecureContext, or null if the files are
 * missing/unreadable. Reloads automatically when either file changes on disk.
 *
 * @param {string} certPath
 * @param {string} keyPath
 * @returns {() => import("tls").SecureContext | null}
 */
function makeContextLoader(certPath, keyPath) {
  /** @type {{ stamp: string, ctx: import("tls").SecureContext } | null} */
  let cache = null;

  return () => {
    let certStat;
    let keyStat;
    try {
      certStat = fs.statSync(certPath);
      keyStat = fs.statSync(keyPath);
    } catch {
      return null; // one or both files absent
    }

    const stamp = `${certStat.mtimeMs}:${certStat.size}:${keyStat.mtimeMs}:${keyStat.size}`;
    if (cache && cache.stamp === stamp) {
      return cache.ctx;
    }

    try {
      const ctx = tls.createSecureContext({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      });
      cache = { stamp, ctx };
      return ctx;
    } catch {
      return null; // unreadable / malformed
    }
  };
}

const loadMkcertContext = makeContextLoader(MKCERT_CERT_PATH, MKCERT_KEY_PATH);
const loadTailscaleContext = makeContextLoader(TAILSCALE_CERT_PATH, TAILSCALE_KEY_PATH);

/**
 * True if at least one usable certificate (mkcert or Tailscale) is present.
 * @returns {boolean}
 */
export function hasAnyCertificate() {
  return loadMkcertContext() !== null || loadTailscaleContext() !== null;
}

/**
 * Build HTTPS server options with SNI-based certificate selection.
 * Returns null when no certificate is available at all (caller should fall
 * back to plain HTTP).
 *
 * @returns {import("https").ServerOptions | null}
 */
export function getHttpsServerOptions() {
  const mkcert = loadMkcertContext();
  const tailscale = loadTailscaleContext();

  if (!mkcert && !tailscale) {
    return null;
  }

  // Default certificate, used for raw-IP connections (no SNI) and any name that
  // is not a Tailscale MagicDNS name. Prefer mkcert (covers localhost / edison /
  // LAN); fall back to the Tailscale cert if mkcert is somehow absent.
  const defaultCertPath = mkcert ? MKCERT_CERT_PATH : TAILSCALE_CERT_PATH;
  const defaultKeyPath = mkcert ? MKCERT_KEY_PATH : TAILSCALE_KEY_PATH;

  return {
    cert: fs.readFileSync(defaultCertPath),
    key: fs.readFileSync(defaultKeyPath),
    SNICallback: (servername, cb) => {
      const isTailnetName = typeof servername === "string" && servername.endsWith(".ts.net");
      // Tailnet name -> trusted Tailscale cert (if available), else fall back to
      // mkcert so the connection still completes (with a browser warning).
      const ctx = (isTailnetName && loadTailscaleContext()) || loadMkcertContext() || loadTailscaleContext();
      cb(null, ctx || undefined);
    },
  };
}
