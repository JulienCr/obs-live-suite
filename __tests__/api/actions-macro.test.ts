import { randomUUID } from "crypto";
import { MacroActionType } from "@/lib/models/Macro";

// Mock MacroRepository
const mockGetById = jest.fn();
jest.mock("@/lib/repositories/MacroRepository", () => ({
  MacroRepository: {
    getInstance: jest.fn(() => ({
      getById: mockGetById,
    })),
  },
}));

// Mock MacroEngine
const mockExecute = jest.fn();
const mockGetIsExecuting = jest.fn();
jest.mock("@/lib/services/MacroEngine", () => ({
  MacroEngine: {
    getInstance: jest.fn(() => ({
      execute: mockExecute,
      getIsExecuting: mockGetIsExecuting,
    })),
  },
}));

// Import after mocks
import { POST } from "@/app/api/actions/macro/route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/actions/macro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const MACRO_ID = randomUUID();

function makeDbMacro() {
  return {
    id: MACRO_ID,
    name: "Test Macro",
    description: null,
    actions: [
      { type: MacroActionType.LOWER_SHOW, params: { title: "Hello" }, delayAfter: 0 },
    ],
    hotkey: null,
    profileId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("POST /api/actions/macro", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIsExecuting.mockReturnValue(false);
    mockExecute.mockResolvedValue(undefined);
  });

  it("should return 400 when macroId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("macroId is required");
  });

  it("should return 404 when macro does not exist", async () => {
    mockGetById.mockReturnValue(null);

    const res = await POST(makeRequest({ macroId: randomUUID() }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });

  it("should return 409 when another macro is already executing", async () => {
    mockGetById.mockReturnValue(makeDbMacro());
    mockGetIsExecuting.mockReturnValue(true);

    const res = await POST(makeRequest({ macroId: MACRO_ID }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("already executing");
  });

  it("should execute macro and return success", async () => {
    const dbMacro = makeDbMacro();
    mockGetById.mockReturnValue(dbMacro);

    const res = await POST(makeRequest({ macroId: MACRO_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, macroId: MACRO_ID });

    expect(mockGetById).toHaveBeenCalledWith(MACRO_ID);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    // Verify the macro passed to execute has the right structure
    const executedMacro = mockExecute.mock.calls[0][0];
    expect(executedMacro.id).toBe(MACRO_ID);
    expect(executedMacro.name).toBe("Test Macro");
    expect(executedMacro.actions).toHaveLength(1);
    expect(executedMacro.actions[0].type).toBe(MacroActionType.LOWER_SHOW);
  });

  it("should return 500 when execution throws", async () => {
    mockGetById.mockReturnValue(makeDbMacro());
    mockExecute.mockRejectedValue(new Error("OBS connection failed"));

    const res = await POST(makeRequest({ macroId: MACRO_ID }));
    expect(res.status).toBe(500);
  });
});
