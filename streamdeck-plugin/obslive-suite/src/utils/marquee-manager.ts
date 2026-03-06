/**
 * Marquee Manager for Stream Deck buttons
 * Slowly scrolls long text on buttons by periodically shifting the visible window.
 */

import { KeyAction } from "@elgato/streamdeck";

const VISIBLE_CHARS = 8;
const TICK_INTERVAL_MS = 600;
const SEPARATOR = "   ";

interface MarqueeEntry {
	/** Full text to scroll (line 1) */
	line1: string;
	/** Full text to scroll (line 2) */
	line2: string;
	/** Current scroll offset for line 1 */
	offset1: number;
	/** Current scroll offset for line 2 */
	offset2: number;
	/** Padded line 1 for seamless wrap */
	padded1: string;
	/** Padded line 2 for seamless wrap */
	padded2: string;
	/** Whether line 1 needs scrolling */
	scrolls1: boolean;
	/** Whether line 2 needs scrolling */
	scrolls2: boolean;
	/** Action to update */
	action: KeyAction;
}

function pad(text: string): string {
	return text + SEPARATOR + text;
}

function window(padded: string, offset: number): string {
	return padded.slice(offset, offset + VISIBLE_CHARS);
}

export class MarqueeManager {
	private entries: Map<string, MarqueeEntry> = new Map();
	private timer: NodeJS.Timeout | null = null;

	/**
	 * Set or update the text for a button. Starts scrolling if needed.
	 * @param actionId Unique action instance ID
	 * @param action Stream Deck action to call setTitle on
	 * @param line1 First line (e.g. artist)
	 * @param line2 Second line (e.g. track)
	 */
	set(actionId: string, action: KeyAction, line1: string, line2: string): void {
		const existing = this.entries.get(actionId);

		// If text hasn't changed, don't reset offsets
		if (existing && existing.line1 === line1 && existing.line2 === line2) {
			existing.action = action;
			return;
		}

		const scrolls1 = line1.length > VISIBLE_CHARS;
		const scrolls2 = line2.length > VISIBLE_CHARS;

		this.entries.set(actionId, {
			line1,
			line2,
			offset1: 0,
			offset2: 0,
			padded1: scrolls1 ? pad(line1) : line1,
			padded2: scrolls2 ? pad(line2) : line2,
			scrolls1,
			scrolls2,
			action,
		});

		// Immediately render current frame
		this.renderEntry(this.entries.get(actionId)!);

		// Start timer if any entry needs scrolling
		this.ensureTimer();
	}

	/**
	 * Remove an action from marquee management.
	 */
	remove(actionId: string): void {
		this.entries.delete(actionId);
		if (this.entries.size === 0) {
			this.stopTimer();
		}
	}

	/**
	 * Clear a button's title and remove from marquee.
	 */
	async clear(actionId: string, action: KeyAction): Promise<void> {
		this.remove(actionId);
		await action.setTitle("");
	}

	private ensureTimer(): void {
		if (this.timer) return;

		// Only start if at least one entry actually scrolls
		const needsScrolling = [...this.entries.values()].some(e => e.scrolls1 || e.scrolls2);
		if (!needsScrolling) return;

		this.timer = setInterval(() => this.tick(), TICK_INTERVAL_MS);
	}

	private stopTimer(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	private tick(): void {
		let anyScrolling = false;

		for (const entry of this.entries.values()) {
			if (!entry.scrolls1 && !entry.scrolls2) continue;
			anyScrolling = true;

			if (entry.scrolls1) {
				entry.offset1 = (entry.offset1 + 1) % (entry.line1.length + SEPARATOR.length);
			}
			if (entry.scrolls2) {
				entry.offset2 = (entry.offset2 + 1) % (entry.line2.length + SEPARATOR.length);
			}

			this.renderEntry(entry);
		}

		if (!anyScrolling) {
			this.stopTimer();
		}
	}

	private renderEntry(entry: MarqueeEntry): void {
		const l1 = entry.scrolls1 ? window(entry.padded1, entry.offset1) : entry.line1;
		const l2 = entry.scrolls2 ? window(entry.padded2, entry.offset2) : entry.line2;

		const title = [l1, l2].filter(Boolean).join("\n");
		void entry.action.setTitle(title);
	}
}

/** Shared singleton */
export const marqueeManager = new MarqueeManager();
