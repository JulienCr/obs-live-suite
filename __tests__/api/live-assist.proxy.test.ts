// __tests__/api/live-assist.proxy.test.ts
import { GET as getSuggestions } from "@/app/api/live-assist/suggestions/route";

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
});
