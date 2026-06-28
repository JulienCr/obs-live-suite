import { getMessageHighlights } from "@/components/presenter/hooks/useStreamerbotMessages";
import type { ChatMessage, HighlightRule } from "@/lib/models/StreamerbotChat";

/**
 * Regression: a chat message whose username/displayName/message is undefined must
 * NOT crash getMessageHighlights. This reproduces the reported dashboard white-screen
 * ("Cannot read properties of undefined (reading 'toLowerCase')") triggered by a
 * malformed/partial message reaching the unguarded consumer.
 */
describe("getMessageHighlights null-safety", () => {
  const rules: HighlightRule[] = [
    { id: "r1", keyword: "hello", color: "#fff", enabled: true },
  ];

  it("does not throw when username/displayName/message are undefined", () => {
    const malformed = {
      id: "x",
      timestamp: 0,
      platform: "youtube",
      eventType: "message",
      username: undefined,
      displayName: undefined,
      message: undefined,
    } as unknown as ChatMessage;

    expect(() => getMessageHighlights(malformed, rules)).not.toThrow();
    const result = getMessageHighlights(malformed, rules);
    expect(result.keyword).toBeNull();
  });

  it("still matches keywords on well-formed messages", () => {
    const ok: ChatMessage = {
      id: "y",
      timestamp: 0,
      platform: "twitch",
      eventType: "message",
      username: "bob",
      displayName: "Bob",
      message: "well hello there",
    };
    expect(getMessageHighlights(ok, rules).keyword?.id).toBe("r1");
  });
});
