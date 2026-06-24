import { ProviderRegistry, type ActionProvider } from "@/lib/services/liveassist/providers/ActionProvider";

const stub = (id: string): ActionProvider => ({
  id, description: `desc ${id}`, defaultKeywords: [id],
  build: async () => null,
  apply: async () => ({ ok: true }),
});

describe("ProviderRegistry", () => {
  it("registers and retrieves providers", () => {
    const r = new ProviderRegistry();
    r.register(stub("poster"));
    expect(r.get("poster")?.id).toBe("poster");
    expect(r.get("missing")).toBeUndefined();
  });

  it("exposes ids and descriptions", () => {
    const r = new ProviderRegistry();
    r.register(stub("poster"));
    r.register(stub("definition"));
    expect(r.ids().sort()).toEqual(["definition", "poster"]);
    expect(r.descriptions().poster).toBe("desc poster");
  });
});
