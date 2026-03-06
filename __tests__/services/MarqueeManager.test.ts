/**
 * Unit tests for MarqueeManager (Stream Deck marquee scrolling utility).
 *
 * The source lives in the streamdeck-plugin workspace which has no Jest config,
 * so we test it from the main project and mock @elgato/streamdeck.
 */

// Mock the @elgato/streamdeck module before any imports
jest.mock("@elgato/streamdeck", () => ({}));

import { MarqueeManager } from "../../streamdeck-plugin/obslive-suite/src/utils/marquee-manager";

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockAction() {
	return { setTitle: jest.fn().mockResolvedValue(undefined) } as any;
}

const SHORT = "Hi";          // 2 chars, no scroll
const LONG1 = "ABCDEFGHIJ";  // 10 chars, > 8 → scrolls
const LONG2 = "1234567890";  // 10 chars, > 8 → scrolls
const SEPARATOR = "   ";     // 3 spaces (matches source)
const VISIBLE = 8;

// ── Tests ────────────────────────────────────────────────────────────────────

describe("MarqueeManager", () => {
	let mgr: MarqueeManager;

	beforeEach(() => {
		jest.useFakeTimers();
		mgr = new MarqueeManager();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	// ── Short text ───────────────────────────────────────────────────────────

	describe("short text (no scrolling needed)", () => {
		it("displays short text as-is without scrolling", () => {
			const action = mockAction();
			mgr.set("a1", action, SHORT, "");

			expect(action.setTitle).toHaveBeenCalledWith(SHORT);
		});

		it("does not start a timer for short text only", () => {
			const action = mockAction();
			mgr.set("a1", action, SHORT, "");

			jest.advanceTimersByTime(3000);
			// setTitle called once on set(), never again by tick
			expect(action.setTitle).toHaveBeenCalledTimes(1);
		});

		it("handles two short lines", () => {
			const action = mockAction();
			mgr.set("a1", action, "Line1", "Line2");

			expect(action.setTitle).toHaveBeenCalledWith("Line1\nLine2");
		});
	});

	// ── Long text ────────────────────────────────────────────────────────────

	describe("long text (scrolling)", () => {
		it("renders the first 8 chars initially for a long line", () => {
			const action = mockAction();
			mgr.set("a1", action, LONG1, "");

			// offset=0 → first VISIBLE chars of padded string
			const expected = LONG1.slice(0, VISIBLE);
			expect(action.setTitle).toHaveBeenCalledWith(expected);
		});

		it("starts a timer and advances offset on each tick", () => {
			const action = mockAction();
			mgr.set("a1", action, LONG1, "");
			action.setTitle.mockClear();

			// One tick at 600ms
			jest.advanceTimersByTime(600);

			const padded = LONG1 + SEPARATOR + LONG1;
			const expected = padded.slice(1, 1 + VISIBLE);
			expect(action.setTitle).toHaveBeenCalledWith(expected);
		});

		it("wraps offset around after text.length + separator.length ticks", () => {
			const action = mockAction();
			mgr.set("a1", action, LONG1, "");

			const wrapAt = LONG1.length + SEPARATOR.length; // 13
			// Advance exactly wrapAt ticks → offset should be back to 0
			jest.advanceTimersByTime(600 * wrapAt);

			const lastCall = action.setTitle.mock.calls[action.setTitle.mock.calls.length - 1][0];
			const expectedAtZero = LONG1.slice(0, VISIBLE);
			expect(lastCall).toBe(expectedAtZero);
		});
	});

	// ── set() idempotency ────────────────────────────────────────────────────

	describe("set() with same vs different text", () => {
		it("does not reset offsets when called with the same text", () => {
			const action = mockAction();
			mgr.set("a1", action, LONG1, "");

			// Advance a few ticks to build up offset
			jest.advanceTimersByTime(600 * 3);
			action.setTitle.mockClear();

			// Re-set with same text
			const action2 = mockAction();
			mgr.set("a1", action2, LONG1, "");

			// No immediate render (offsets preserved, action updated silently)
			expect(action2.setTitle).not.toHaveBeenCalled();

			// Next tick should continue from offset 4, not reset to 1
			jest.advanceTimersByTime(600);
			const padded = LONG1 + SEPARATOR + LONG1;
			const expected = padded.slice(4, 4 + VISIBLE);
			expect(action2.setTitle).toHaveBeenCalledWith(expected);
		});

		it("resets offsets when called with new text", () => {
			const action = mockAction();
			mgr.set("a1", action, LONG1, "");

			// Advance ticks
			jest.advanceTimersByTime(600 * 3);

			// Set with different text
			const action2 = mockAction();
			const newText = "ZYXWVUTSRQ"; // 10 chars, different
			mgr.set("a1", action2, newText, "");

			// Immediate render at offset 0
			expect(action2.setTitle).toHaveBeenCalledWith(newText.slice(0, VISIBLE));
		});
	});

	// ── remove() ─────────────────────────────────────────────────────────────

	describe("remove()", () => {
		it("removes the entry so ticks no longer update it", () => {
			const action = mockAction();
			mgr.set("a1", action, LONG1, "");
			action.setTitle.mockClear();

			mgr.remove("a1");
			jest.advanceTimersByTime(600 * 5);

			expect(action.setTitle).not.toHaveBeenCalled();
		});

		it("stops the timer when the last entry is removed", () => {
			const action = mockAction();
			mgr.set("a1", action, LONG1, "");

			mgr.remove("a1");

			// Add a new short-text entry after removing; timer should not be running
			const action2 = mockAction();
			mgr.set("a2", action2, SHORT, "");
			action2.setTitle.mockClear();

			jest.advanceTimersByTime(3000);
			expect(action2.setTitle).not.toHaveBeenCalled();
		});
	});

	// ── clear() ──────────────────────────────────────────────────────────────

	describe("clear()", () => {
		it("removes entry and calls action.setTitle with empty string", async () => {
			const action = mockAction();
			mgr.set("a1", action, LONG1, "");

			const clearAction = mockAction();
			await mgr.clear("a1", clearAction);

			expect(clearAction.setTitle).toHaveBeenCalledWith("");
		});

		it("stops ticking after clear", async () => {
			const action = mockAction();
			mgr.set("a1", action, LONG1, "");
			action.setTitle.mockClear();

			await mgr.clear("a1", action);
			action.setTitle.mockClear();

			jest.advanceTimersByTime(3000);
			expect(action.setTitle).not.toHaveBeenCalled();
		});
	});

	// ── Multiple entries ─────────────────────────────────────────────────────

	describe("multiple entries", () => {
		it("maintains independent offsets per entry", () => {
			const action1 = mockAction();
			const action2 = mockAction();

			mgr.set("a1", action1, LONG1, "");
			// Advance 2 ticks for a1
			jest.advanceTimersByTime(600 * 2);

			// Now add a2 — its offset starts at 0
			mgr.set("a2", action2, LONG2, "");

			// a2 should render at offset 0
			expect(action2.setTitle).toHaveBeenCalledWith(LONG2.slice(0, VISIBLE));

			action1.setTitle.mockClear();
			action2.setTitle.mockClear();

			// One more tick
			jest.advanceTimersByTime(600);

			// a1 should be at offset 3, a2 at offset 1
			const padded1 = LONG1 + SEPARATOR + LONG1;
			const padded2 = LONG2 + SEPARATOR + LONG2;
			expect(action1.setTitle).toHaveBeenCalledWith(padded1.slice(3, 3 + VISIBLE));
			expect(action2.setTitle).toHaveBeenCalledWith(padded2.slice(1, 1 + VISIBLE));
		});

		it("keeps timer running when one scrolling entry remains", () => {
			const action1 = mockAction();
			const action2 = mockAction();

			mgr.set("a1", action1, LONG1, "");
			mgr.set("a2", action2, LONG2, "");

			mgr.remove("a1");
			action2.setTitle.mockClear();

			jest.advanceTimersByTime(600);
			// a2 should still tick
			expect(action2.setTitle).toHaveBeenCalled();
		});
	});

	// ── Two-line scrolling ───────────────────────────────────────────────────

	describe("two-line scrolling", () => {
		it("scrolls both lines independently when both are long", () => {
			const action = mockAction();
			const lineA = "ABCDEFGHIJ"; // 10 chars
			const lineB = "0123456789AB"; // 12 chars

			mgr.set("a1", action, lineA, lineB);

			// Initial render: both at offset 0
			expect(action.setTitle).toHaveBeenCalledWith(
				lineA.slice(0, VISIBLE) + "\n" + lineB.slice(0, VISIBLE)
			);

			action.setTitle.mockClear();
			jest.advanceTimersByTime(600);

			const paddedA = lineA + SEPARATOR + lineA;
			const paddedB = lineB + SEPARATOR + lineB;
			expect(action.setTitle).toHaveBeenCalledWith(
				paddedA.slice(1, 1 + VISIBLE) + "\n" + paddedB.slice(1, 1 + VISIBLE)
			);
		});

		it("scrolls only the long line when one line is short", () => {
			const action = mockAction();
			mgr.set("a1", action, LONG1, SHORT);

			action.setTitle.mockClear();
			jest.advanceTimersByTime(600);

			const padded = LONG1 + SEPARATOR + LONG1;
			// Line 1 scrolls, line 2 stays as-is
			expect(action.setTitle).toHaveBeenCalledWith(
				padded.slice(1, 1 + VISIBLE) + "\n" + SHORT
			);
		});
	});

	// ── Timer management edge cases ──────────────────────────────────────────

	describe("timer management", () => {
		it("does not start timer when only non-scrolling entries exist", () => {
			const action = mockAction();
			mgr.set("a1", action, SHORT, "AB");
			action.setTitle.mockClear();

			jest.advanceTimersByTime(3000);
			expect(action.setTitle).not.toHaveBeenCalled();
		});

		it("stops timer via tick when scrolling entry is removed mid-run", () => {
			const action1 = mockAction();
			const action2 = mockAction();

			mgr.set("a1", action1, LONG1, "");
			mgr.set("a2", action2, SHORT, "");

			// Remove the scrolling entry; non-scrolling one remains
			mgr.remove("a1");
			action2.setTitle.mockClear();

			// Timer still runs (entries.size > 0 after remove of a1, but a2 doesn't scroll)
			// After tick, timer should self-stop because no entry scrolls
			jest.advanceTimersByTime(600 * 5);
			expect(action2.setTitle).not.toHaveBeenCalled();
		});
	});
});
