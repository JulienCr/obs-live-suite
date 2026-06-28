// __tests__/api/live-assist.proxy.test.ts
import { GET as getSuggestions } from "@/app/api/live-assist/suggestions/route";
import { POST as clearSuggestions } from "@/app/api/live-assist/suggestions/clear/route";

describe("live-assist proxy", () => {
  it("proxies suggestions list from the backend", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [{ id: "a" }] }), { status: 200 }),
    );
    const res = await getSuggestions(new Request("http://x/api/live-assist/suggestions"), { params: Promise.resolve({}) } as any);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(1);
    fetchSpy.mockRestore();
  });

  it("proxies the clear POST to the backend", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const res = await clearSuggestions(new Request("http://x/api/live-assist/suggestions/clear", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/live-assist/suggestions/clear"),
      expect.objectContaining({ method: "POST" }),
    );
    fetchSpy.mockRestore();
  });

  it("forwards a backend error status instead of collapsing it to 422", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "boom" }), { status: 503, headers: { "content-type": "application/json" } }),
    );
    const res = await clearSuggestions(new Request("http://x/api/live-assist/suggestions/clear", { method: "POST" }));
    expect(res.status).toBe(503);
    fetchSpy.mockRestore();
  });
});
