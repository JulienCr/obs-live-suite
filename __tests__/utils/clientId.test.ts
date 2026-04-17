/**
 * @jest-environment jsdom
 */
describe("clientId", () => {
  const STORAGE_KEY = "ols.clientId";

  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  it("generates a new UUID and persists it to localStorage on first load", () => {
    const { CLIENT_ID } = require("@/lib/utils/clientId") as { CLIENT_ID: string };
    expect(CLIENT_ID).toMatch(/^[0-9a-f-]{36}$/i);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(CLIENT_ID);
  });

  it("reuses the stored UUID on subsequent loads", () => {
    window.localStorage.setItem(STORAGE_KEY, "11111111-2222-3333-4444-555555555555");
    const { CLIENT_ID } = require("@/lib/utils/clientId") as { CLIENT_ID: string };
    expect(CLIENT_ID).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("falls back to a fresh UUID when localStorage throws", () => {
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    try {
      const { CLIENT_ID } = require("@/lib/utils/clientId") as { CLIENT_ID: string };
      expect(CLIENT_ID).toMatch(/^[0-9a-f-]{36}$/i);
    } finally {
      getItem.mockRestore();
    }
  });
});
