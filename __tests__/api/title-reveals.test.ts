import express from "express";
import request from "supertest";

// Mock ChannelManager - publish mock is inside the singleton
jest.mock("@/lib/services/ChannelManager", () => {
  const publish = jest.fn().mockResolvedValue(undefined);
  return {
    ChannelManager: {
      getInstance: () => ({ publish }),
      __mockPublish: publish,
    },
  };
});

// Mock WebSocketHub
jest.mock("@/lib/services/WebSocketHub", () => ({
  WebSocketHub: {
    getInstance: () => ({
      broadcast: jest.fn(),
    }),
  },
}));

// Mock SettingsService
jest.mock("@/lib/services/SettingsService", () => ({
  SettingsService: {
    getInstance: () => ({
      getOverlaySettings: () => ({
        chatHighlightAutoHide: true,
        chatHighlightDuration: 10,
      }),
    }),
  },
}));

// Mock OBS
jest.mock("@/lib/adapters/obs/OBSConnectionManager", () => ({
  OBSConnectionManager: {
    getInstance: () => ({
      getOBS: jest.fn(),
    }),
  },
}));

jest.mock("@/server/api/obs-helpers", () => ({
  updatePosterSourceInOBS: jest.fn(),
}));

// Mock theme enrichment
jest.mock("@/lib/utils/themeEnrichment", () => ({
  enrichLowerThirdPayload: jest.fn((p: unknown) => p),
  enrichCountdownPayload: jest.fn((p: unknown) => p),
  enrichPosterPayload: jest.fn((p: unknown) => p),
  enrichChatHighlightPayload: jest.fn((p: unknown) => p),
  enrichTitleRevealPayload: jest.fn((p: unknown) => p),
}));

// Mock Logger
jest.mock("@/lib/utils/Logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Import after mocks
import overlaysRouter from "@/server/api/overlays";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { enrichTitleRevealPayload } from "@/lib/utils/themeEnrichment";

// Get the mock publish function created inside the factory
const mockPublish = (ChannelManager as unknown as { __mockPublish: jest.Mock }).__mockPublish;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/overlays", overlaysRouter);
  return app;
}

describe("Title Reveal API", () => {
  let app: express.Application;

  beforeEach(() => {
    mockPublish.mockClear();
    (enrichTitleRevealPayload as jest.Mock).mockClear();
    app = createApp();
  });

  describe("POST /api/overlays/title-reveal", () => {
    it('should validate payload, enrich, and publish PLAY event for action "play"', async () => {
      const payload = {
        lines: [{ text: "Hello World" }],
      };

      const res = await request(app)
        .post("/api/overlays/title-reveal")
        .send({ action: "play", payload });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(enrichTitleRevealPayload).toHaveBeenCalled();
      expect(mockPublish).toHaveBeenCalledWith(
        "title-reveal",
        "play",
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ text: "Hello World" }),
          ]),
        })
      );
    });

    it('should publish HIDE event for action "hide"', async () => {
      const res = await request(app)
        .post("/api/overlays/title-reveal")
        .send({ action: "hide" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(mockPublish).toHaveBeenCalledWith("title-reveal", "hide");
    });

    it("should return 400 for invalid action", async () => {
      const res = await request(app)
        .post("/api/overlays/title-reveal")
        .send({ action: "invalid" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Invalid action" });
    });

    it("should return error when play payload validation fails", async () => {
      const res = await request(app)
        .post("/api/overlays/title-reveal")
        .send({ action: "play", payload: { lines: [] } });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
