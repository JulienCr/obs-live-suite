import {
  chatUIPreferencesSchema,
  chatSendTargetSchema,
  DEFAULT_CHAT_UI_PREFERENCES,
} from "@/lib/models/streamerbot";

/**
 * The chat input's "send target" (Twitch / YouTube / Both) is persisted as part of
 * the chat UI preferences so it survives reloads. Default must be "both".
 */
describe("chat send target preference", () => {
  it("defaults sendTarget to 'both' when missing (backward compatible with old stored prefs)", () => {
    const parsed = chatUIPreferencesSchema.parse({});
    expect(parsed.sendTarget).toBe("both");
  });

  it("accepts twitch / youtube / both", () => {
    for (const t of ["twitch", "youtube", "both"] as const) {
      expect(chatUIPreferencesSchema.parse({ sendTarget: t }).sendTarget).toBe(t);
    }
  });

  it("rejects unknown targets", () => {
    expect(chatSendTargetSchema.safeParse("discord").success).toBe(false);
  });

  it("DEFAULT_CHAT_UI_PREFERENCES carries sendTarget 'both'", () => {
    expect(DEFAULT_CHAT_UI_PREFERENCES.sendTarget).toBe("both");
  });
});
