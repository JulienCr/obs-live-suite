/**
 * Title Helper Utilities
 * Handles text wrapping for Stream Deck button titles
 */

/**
 * Wrap title text to fit on Stream Deck button
 * Splits long text into two lines at word boundary or midpoint
 *
 * @param text - The text to wrap
 * @param maxLineLength - Maximum characters per line before wrapping (default: 10)
 * @returns Text with newline inserted if needed
 */
export function wrapTitle(text: string, maxLineLength: number = 10): string {
	if (!text || text.length <= maxLineLength) {
		return text;
	}

	const words = text.split(" ");

	// If we have multiple words, try to split at word boundary
	if (words.length >= 2) {
		const midpoint = Math.ceil(words.length / 2);
		const firstLine = words.slice(0, midpoint).join(" ");
		const secondLine = words.slice(midpoint).join(" ");
		return `${firstLine}\n${secondLine}`;
	}

	// Single long word: split at character midpoint
	const mid = Math.ceil(text.length / 2);
	return `${text.slice(0, mid)}\n${text.slice(mid)}`;
}

/**
 * Generate a slot placeholder title
 * @param slotType - "Guest" or "Poster"
 * @param slotNumber - The slot number (1-30)
 */
export function getSlotPlaceholderTitle(slotType: "Guest" | "Poster", slotNumber: number): string {
	return `${slotType} ${slotNumber}`;
}
