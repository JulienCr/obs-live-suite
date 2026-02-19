import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  verifyCodeChallenge,
} from "@/lib/utils/pkce";

describe("generateCodeVerifier", () => {
  it("returns a 64-character string", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toHaveLength(64);
  });

  it("uses base64url-safe characters only", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique values", () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe("generateCodeChallenge", () => {
  it("returns a base64url-encoded string", () => {
    const challenge = generateCodeChallenge("test-verifier");
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is deterministic for same input", () => {
    const a = generateCodeChallenge("same-input");
    const b = generateCodeChallenge("same-input");
    expect(a).toBe(b);
  });

  it("produces different output for different input", () => {
    const a = generateCodeChallenge("input-a");
    const b = generateCodeChallenge("input-b");
    expect(a).not.toBe(b);
  });
});

describe("generateState", () => {
  it("returns a 32-character hex string", () => {
    const state = generateState();
    expect(state).toHaveLength(32);
    expect(state).toMatch(/^[0-9a-f]+$/);
  });

  it("generates unique values", () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
  });
});

describe("verifyCodeChallenge", () => {
  it("returns true for matching verifier and challenge", () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
  });

  it("returns false for mismatched verifier and challenge", () => {
    const verifier = generateCodeVerifier();
    expect(verifyCodeChallenge(verifier, "wrong-challenge")).toBe(false);
  });
});
