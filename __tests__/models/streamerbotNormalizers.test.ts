import {
  normalizeTwitchFollowEvent,
  normalizeTwitchSubEvent,
  normalizeTwitchReSubEvent,
  normalizeTwitchGiftSubEvent,
  normalizeTwitchRaidEvent,
  normalizeTwitchCheerEvent,
  normalizeYouTubeNewSponsor,
} from "@/lib/models/streamerbot";

/**
 * These tests exercise the real normalizers directly — the path the `/dev` event
 * tester bypasses (it injects pre-built ChatMessages). They lock in:
 *   1. the canonical @streamerbot/client field shapes (the original empty-name bug),
 *   2. the defensive fallbacks for the alternate shapes Streamer.bot has shipped
 *      across versions (nested `user` / `fromUser` objects).
 * The viewer name (displayName/username) must never come out empty.
 */
// Cast helper: payloads are intentionally shaped like the real (loosely-typed) wire
// data, which doesn't match our strict interfaces field-for-field.
const ev = (data: unknown) => ({ event: {}, data } as never);

describe("Streamer.bot viewer-event normalizers", () => {
  describe("Twitch.Follow", () => {
    it("extracts the name from the canonical snake_case shape", () => {
      const msg = normalizeTwitchFollowEvent(
        ev({ user_id: "1", user_login: "alice", user_name: "Alice" }),
      );
      expect(msg.displayName).toBe("Alice");
      expect(msg.username).toBe("alice");
      expect(msg.eventType).toBe("follow");
    });

    it("falls back to a nested user object (defensive)", () => {
      const msg = normalizeTwitchFollowEvent(
        ev({ user: { login: "bob", name: "Bob" } }),
      );
      expect(msg.displayName).toBe("Bob");
      expect(msg.username).toBe("bob");
    });
  });

  describe("Twitch.Sub", () => {
    it("uses the separate displayName and stringifies subTier", () => {
      const msg = normalizeTwitchSubEvent(
        ev({ userId: "1", userName: "carol", displayName: "Carol", subTier: 2000 }),
      );
      expect(msg.displayName).toBe("Carol");
      expect(msg.username).toBe("carol");
      expect(msg.metadata?.subscriptionTier).toBe("2000");
    });
  });

  describe("Twitch.ReSub", () => {
    it("extracts name and months", () => {
      const msg = normalizeTwitchReSubEvent(
        ev({ userId: "1", userName: "dan", displayName: "Dan", subTier: 1000, cumulativeMonths: 7 }),
      );
      expect(msg.displayName).toBe("Dan");
      expect(msg.metadata?.monthsSubscribed).toBe(7);
    });
  });

  describe("Twitch.GiftSub", () => {
    it("names both gifter and recipient", () => {
      const msg = normalizeTwitchGiftSubEvent(
        ev({
          userId: "1", userName: "eve", displayName: "Eve",
          recipientUserId: "2", recipientDisplayName: "Frank", subTier: 1000,
        }),
      );
      expect(msg.displayName).toBe("Eve");
      expect(msg.message).toContain("Frank");
      expect(msg.metadata?.eventData?.recipient).toBe("Frank");
    });

    it("renders anonymous gifters without leaking an empty name", () => {
      const msg = normalizeTwitchGiftSubEvent(
        ev({ isAnonymous: true, recipientDisplayName: "Grace", subTier: 1000 }),
      );
      expect(msg.displayName).toBe("Anonymous");
      expect(msg.message).toContain("Grace");
    });
  });

  describe("Twitch.Raid", () => {
    it("extracts the raider from from_broadcaster_* and the viewer count", () => {
      const msg = normalizeTwitchRaidEvent(
        ev({ from_broadcaster_user_id: "1", from_broadcaster_user_login: "heidi", from_broadcaster_user_name: "Heidi", viewers: 50 }),
      );
      expect(msg.displayName).toBe("Heidi");
      expect(msg.metadata?.eventData?.viewers).toBe(50);
    });
  });

  describe("Twitch.Cheer", () => {
    it("uses username (lowercase) + displayName", () => {
      const msg = normalizeTwitchCheerEvent(
        ev({ userId: "1", username: "ivan", displayName: "Ivan", bits: 100 }),
      );
      expect(msg.displayName).toBe("Ivan");
      expect(msg.username).toBe("ivan");
      expect(msg.metadata?.eventData?.bits).toBe(100);
    });
  });

  describe("YouTube.NewSponsor", () => {
    it("maps a membership to a sub event with a name", () => {
      const msg = normalizeYouTubeNewSponsor(
        ev({ userId: "1", userName: "Judy", level: "Member" }),
      );
      expect(msg.displayName).toBe("Judy");
      expect(msg.eventType).toBe("sub");
      expect(msg.platform).toBe("youtube");
    });
  });

  describe("regression: the original bug", () => {
    it("never yields an empty name when the canonical fields are present", () => {
      const msg = normalizeTwitchFollowEvent(
        ev({ user_id: "1", user_login: "k", user_name: "Kevin" }),
      );
      expect(msg.displayName).not.toBe("");
      expect(msg.username).not.toBe("");
    });
  });
});
