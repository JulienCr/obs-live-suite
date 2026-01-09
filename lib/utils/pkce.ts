/**
 * PKCE (Proof Key for Code Exchange) Utilities
 *
 * Implements RFC 7636 PKCE for secure OAuth 2.0 authorization code flow.
 * Used by Twitch OAuth to prevent authorization code interception attacks.
 */

import crypto from "crypto";

/**
 * Generate a cryptographically random code verifier
 * RFC 7636 specifies: 43-128 characters, using [A-Z], [a-z], [0-9], "-", ".", "_", "~"
 *
 * @returns A random 64-character base64url-encoded string
 */
export function generateCodeVerifier(): string {
  // 48 bytes = 64 base64url characters
  return crypto.randomBytes(48).toString("base64url");
}

/**
 * Generate the code challenge from a code verifier using SHA-256
 * This is the S256 challenge method (recommended by RFC 7636)
 *
 * @param verifier - The code verifier string
 * @returns Base64url-encoded SHA-256 hash of the verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

/**
 * Generate a random state parameter for CSRF protection
 *
 * @returns A random 32-character hex string
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Verify that a code challenge matches a code verifier
 * Used for testing/validation purposes
 *
 * @param verifier - The original code verifier
 * @param challenge - The code challenge to verify
 * @returns True if the challenge matches the verifier
 */
export function verifyCodeChallenge(verifier: string, challenge: string): boolean {
  const expectedChallenge = generateCodeChallenge(verifier);
  return expectedChallenge === challenge;
}
