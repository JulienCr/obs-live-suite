import express from "express";
import request from "supertest";

// Mock SettingsService before import
const mockGetChatPredefinedMessages = jest.fn();
const mockSaveChatPredefinedMessages = jest.fn();

jest.mock("@/lib/services/SettingsService", () => ({
  SettingsService: {
    getInstance: jest.fn(() => ({
      getChatPredefinedMessages: mockGetChatPredefinedMessages,
      saveChatPredefinedMessages: mockSaveChatPredefinedMessages,
    })),
  },
}));

// Import after mock
import chatMessagesRouter from "@/server/api/chat-messages";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/chat-messages", chatMessagesRouter);
  return app;
}

describe("Chat Messages API", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/chat-messages/settings", () => {
    it("should return messages array from service", async () => {
      const messages = [
        { id: "11111111-1111-1111-1111-111111111111", title: "Hello", message: "Hello everyone!" },
        { id: "22222222-2222-2222-2222-222222222222", title: "GG", message: "Good game!" },
      ];
      mockGetChatPredefinedMessages.mockReturnValue(messages);

      const res = await request(app).get("/api/chat-messages/settings");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ messages });
      expect(mockGetChatPredefinedMessages).toHaveBeenCalledTimes(1);
    });

    it("should handle service error with 500", async () => {
      mockGetChatPredefinedMessages.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const res = await request(app).get("/api/chat-messages/settings");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to get chat messages" });
    });
  });

  describe("PUT /api/chat-messages/settings", () => {
    it("should save valid messages and return them with trimmed values", async () => {
      const inputMessages = [
        { id: "11111111-1111-1111-1111-111111111111", title: "  Hello  ", message: "  Hello everyone!  " },
      ];

      const res = await request(app)
        .put("/api/chat-messages/settings")
        .send({ messages: inputMessages });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messages).toEqual([
        { id: "11111111-1111-1111-1111-111111111111", title: "Hello", message: "Hello everyone!" },
      ]);
      expect(mockSaveChatPredefinedMessages).toHaveBeenCalledWith([
        { id: "11111111-1111-1111-1111-111111111111", title: "Hello", message: "Hello everyone!" },
      ]);
    });

    it("should generate UUID when id is missing", async () => {
      const inputMessages = [
        { title: "Hello", message: "Hi there" },
      ];

      const res = await request(app)
        .put("/api/chat-messages/settings")
        .send({ messages: inputMessages });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // The id should be a UUID (36 chars with dashes)
      expect(res.body.messages[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(res.body.messages[0].title).toBe("Hello");
      expect(res.body.messages[0].message).toBe("Hi there");
    });

    it("should return 400 when title is empty", async () => {
      const inputMessages = [
        { title: "", message: "Some message" },
      ];

      const res = await request(app)
        .put("/api/chat-messages/settings")
        .send({ messages: inputMessages });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(mockSaveChatPredefinedMessages).not.toHaveBeenCalled();
    });

    it("should return 400 when message exceeds 500 characters", async () => {
      const inputMessages = [
        { title: "Title", message: "x".repeat(501) },
      ];

      const res = await request(app)
        .put("/api/chat-messages/settings")
        .send({ messages: inputMessages });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(mockSaveChatPredefinedMessages).not.toHaveBeenCalled();
    });

    it("should return 400 when title exceeds 50 characters", async () => {
      const inputMessages = [
        { title: "x".repeat(51), message: "Valid message" },
      ];

      const res = await request(app)
        .put("/api/chat-messages/settings")
        .send({ messages: inputMessages });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(mockSaveChatPredefinedMessages).not.toHaveBeenCalled();
    });

    it("should handle service error with 500", async () => {
      mockSaveChatPredefinedMessages.mockImplementation(() => {
        throw new Error("Database write failed");
      });

      const inputMessages = [
        { title: "Hello", message: "Hi there" },
      ];

      const res = await request(app)
        .put("/api/chat-messages/settings")
        .send({ messages: inputMessages });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to save chat messages" });
    });
  });
});
