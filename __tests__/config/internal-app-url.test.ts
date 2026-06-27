import { INTERNAL_APP_URL } from "@/lib/config/urls";

// Regression guard for the "fetch failed" bug: the backend's Live Assist providers
// POST to the Next.js app, and on Node 22 + Windows `localhost` resolves to ::1
// (IPv6) while the dev server listens on IPv4 → ECONNREFUSED. The internal
// server-to-server base MUST use the 127.0.0.1 loopback, never `localhost`.
describe("INTERNAL_APP_URL", () => {
  it("targets the 127.0.0.1 loopback on the app port, never localhost", () => {
    expect(INTERNAL_APP_URL).toContain("127.0.0.1");
    expect(INTERNAL_APP_URL).not.toContain("localhost");
    expect(INTERNAL_APP_URL).toMatch(/:3000$/);
  });
});
