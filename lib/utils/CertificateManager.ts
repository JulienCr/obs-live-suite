/**
 * Certificate Manager - Centralized HTTPS certificate handling
 *
 * This module provides a single source of truth for SSL/TLS certificate
 * management across the application. It handles:
 * - Certificate path resolution
 * - Certificate existence checking
 * - Certificate loading
 * - HTTPS options creation
 *
 * Used by:
 * - server/backend.ts (Express API)
 * - server.js (Next.js HTTPS server)
 * - lib/services/WebSocketHub.ts (WebSocket Secure)
 */

import fs from "fs";
import https from "https";
import http from "http";
import type { Application } from "express";
import { CERT_PATH, KEY_PATH } from "@/lib/config/certificates.mjs";

/**
 * Certificate configuration
 */
export interface CertificateConfig {
  certPath: string;
  keyPath: string;
  available: boolean;
}

/**
 * HTTPS options for server creation
 */
export interface HttpsOptions {
  key: Buffer;
  cert: Buffer;
}

/**
 * Get certificate file paths
 * Uses centralized config from lib/config/certificates.mjs
 */
export function getCertificatePaths(): { certPath: string; keyPath: string } {
  return {
    certPath: CERT_PATH,
    keyPath: KEY_PATH,
  };
}

/**
 * Check if SSL certificates are available
 */
export function certificatesExist(): boolean {
  const { certPath, keyPath } = getCertificatePaths();
  return fs.existsSync(certPath) && fs.existsSync(keyPath);
}

/**
 * Get certificate configuration with availability status
 */
export function getCertificateConfig(): CertificateConfig {
  const { certPath, keyPath } = getCertificatePaths();
  return {
    certPath,
    keyPath,
    available: fs.existsSync(certPath) && fs.existsSync(keyPath),
  };
}

/**
 * Load certificates and return HTTPS options
 * @throws Error if certificates don't exist
 */
export function loadCertificates(): HttpsOptions {
  const { certPath, keyPath } = getCertificatePaths();

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error(
      `SSL certificates not found at ${certPath} and ${keyPath}. ` +
      "Run 'node scripts/setup-https.js' to generate them."
    );
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

/**
 * Try to load certificates, returns null if not available
 */
export function tryLoadCertificates(): HttpsOptions | null {
  try {
    return loadCertificates();
  } catch {
    return null;
  }
}

/**
 * Create an HTTPS server with the app if certificates are available,
 * otherwise fall back to HTTP
 *
 * @param app Express application
 * @returns Object with server and isHttps flag
 */
export function createServerWithFallback(app: Application): {
  server: https.Server | http.Server;
  isHttps: boolean;
} {
  const httpsOptions = tryLoadCertificates();

  if (httpsOptions) {
    return {
      server: https.createServer(httpsOptions, app),
      isHttps: true,
    };
  }

  return {
    server: http.createServer(app),
    isHttps: false,
  };
}

/**
 * Create an HTTP server (for WebSocket) with HTTPS if certificates available
 *
 * @returns Object with server and isHttps flag
 */
export function createHttpServerWithFallback(): {
  server: https.Server | http.Server;
  isHttps: boolean;
} {
  const httpsOptions = tryLoadCertificates();

  if (httpsOptions) {
    return {
      server: https.createServer(httpsOptions),
      isHttps: true,
    };
  }

  return {
    server: http.createServer(),
    isHttps: false,
  };
}
