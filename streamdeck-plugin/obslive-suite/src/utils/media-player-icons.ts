/**
 * Media Player Icon Generators
 * SVG icons for Stream Deck media player transport controls
 */

import { toSvgDataUri } from "./image-helper";

export type IconGenerator = (bg: string, accent: string) => string;

export const DRIVER_COLORS: Record<string, { bg: string; accent: string }> = {
	artlist: { bg: "#3d3520", accent: "#f5c518" },
	youtube: { bg: "#3d1c1c", accent: "#ff4444" },
};

export const DEFAULT_DRIVER_COLORS = { bg: "#2a2a2a", accent: "#888888" };

/**
 * Get colors for a given driver ID
 */
export function getDriverColors(driverId: string): { bg: string; accent: string } {
	return DRIVER_COLORS[driverId.toLowerCase()] ?? DEFAULT_DRIVER_COLORS;
}

const iconCache = new Map<string, string>();

function makeIcon(name: string, bg: string, accent: string, inner: string): string {
	const key = `${name}:${bg}:${accent}`;
	const existing = iconCache.get(key);
	if (existing) return existing;
	const result = toSvgDataUri(`
		<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
			<rect width="144" height="144" fill="${bg}" rx="8"/>
			${inner}
		</svg>
	`);
	iconCache.set(key, result);
	return result;
}

export function generatePlayIcon(bg: string, accent: string): string {
	return makeIcon("play", bg, accent, `<polygon points="52,36 52,108 112,72" fill="${accent}"/>`);
}

export function generatePauseIcon(bg: string, accent: string): string {
	return makeIcon("pause", bg, accent, `
		<rect x="42" y="36" width="20" height="72" rx="4" fill="${accent}"/>
		<rect x="82" y="36" width="20" height="72" rx="4" fill="${accent}"/>
	`);
}

export function generateNextIcon(bg: string, accent: string): string {
	return makeIcon("next", bg, accent, `
		<polygon points="36,36 36,108 88,72" fill="${accent}"/>
		<rect x="94" y="36" width="16" height="72" rx="4" fill="${accent}"/>
	`);
}

export function generatePrevIcon(bg: string, accent: string): string {
	return makeIcon("prev", bg, accent, `
		<rect x="34" y="36" width="16" height="72" rx="4" fill="${accent}"/>
		<polygon points="108,36 108,108 56,72" fill="${accent}"/>
	`);
}

export function generateStopIcon(bg: string, accent: string): string {
	return makeIcon("stop", bg, accent, `<rect x="40" y="40" width="64" height="64" rx="6" fill="${accent}"/>`);
}

export function generateFadeoutIcon(bg: string, accent: string): string {
	return makeIcon("fadeout", bg, accent, `
		<polygon points="52,36 52,108 112,72" fill="${accent}" opacity="0.3"/>
		<rect x="34" y="42" width="8" height="60" rx="3" fill="${accent}" opacity="1"/>
		<rect x="48" y="48" width="8" height="48" rx="3" fill="${accent}" opacity="0.75"/>
		<rect x="62" y="54" width="8" height="36" rx="3" fill="${accent}" opacity="0.5"/>
		<rect x="76" y="60" width="8" height="24" rx="3" fill="${accent}" opacity="0.25"/>
	`);
}
