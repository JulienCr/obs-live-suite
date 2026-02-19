import { waitForFont } from "@/lib/utils/fontLoader";

describe("waitForFont", () => {
  it("returns true in non-browser environment", async () => {
    // In Node.js test env, document is undefined, so it returns true immediately
    expect(await waitForFont("Arial")).toBe(true);
  });

  it("returns true for generic font families", async () => {
    expect(await waitForFont("sans-serif")).toBe(true);
    expect(await waitForFont("serif")).toBe(true);
    expect(await waitForFont("monospace")).toBe(true);
  });
});
