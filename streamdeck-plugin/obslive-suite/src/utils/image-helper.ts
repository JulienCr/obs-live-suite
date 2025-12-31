/**
 * Image Helper Utilities
 * Handles image fetching and conversion for Stream Deck buttons
 */

import http from "http";
import https from "https";
import { APP_PORT } from "../../../../lib/config/urls";

/**
 * Default base URL for API requests
 * Port value imported from lib/config/urls.ts (single source of truth)
 */
const DEFAULT_BASE_URL = `http://127.0.0.1:${APP_PORT}`;

/**
 * Fetch an image from a URL and convert to base64 data URI
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		try {
			const urlObj = new URL(url);
			const isHttps = urlObj.protocol === "https:";
			const client = isHttps ? https : http;

			const requestOptions: http.RequestOptions = {
				hostname: urlObj.hostname,
				port: urlObj.port || (isHttps ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: "GET",
				timeout: 5000, // 5 second timeout
			};

			const req = client.request(requestOptions, (res) => {
				if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
					reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
					return;
				}

				const chunks: Buffer[] = [];

				res.on("data", (chunk) => {
					chunks.push(chunk);
				});

				res.on("end", () => {
					const buffer = Buffer.concat(chunks as Uint8Array[]);
					const contentType = res.headers["content-type"] || "image/png";
					const base64 = buffer.toString("base64");
					const dataUri = `data:${contentType};base64,${base64}`;
					resolve(dataUri);
				});
			});

			req.on("error", (error) => {
				reject(error);
			});

			req.on("timeout", () => {
				req.destroy();
				reject(new Error("Request timeout"));
			});

			req.end();
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Generate a simple SVG avatar with initials as fallback
 */
export function generateInitialsAvatar(name: string, color: string = "#3b82f6"): string {
	const initials = name
		.split(" ")
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	const svg = `
		<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
			<rect width="144" height="144" fill="${color}" rx="8"/>
			<text
				x="50%"
				y="50%"
				font-family="Arial, sans-serif"
				font-size="60"
				font-weight="bold"
				fill="white"
				text-anchor="middle"
				dominant-baseline="central"
			>${initials}</text>
		</svg>
	`.trim();

	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

/**
 * Fetch guest avatar or generate fallback
 */
export async function getGuestAvatar(avatarUrl: string | null | undefined, displayName: string, baseUrl: string = DEFAULT_BASE_URL): Promise<string> {
	// If no avatar URL, generate initials
	if (!avatarUrl) {
		return generateInitialsAvatar(displayName);
	}

	try {
		// Convert relative paths to absolute URLs
		const fullUrl = avatarUrl.startsWith("http") ? avatarUrl : `${baseUrl}${avatarUrl}`;
		
		// Try to fetch the actual avatar
		return await fetchImageAsBase64(fullUrl);
	} catch (error) {
		console.warn(`[Image Helper] Failed to fetch avatar from ${avatarUrl}:`, error);
		// Fallback to initials if fetch fails
		return generateInitialsAvatar(displayName);
	}
}

/**
 * Generate a simple SVG icon for poster with title
 */
export function generatePosterFallbackIcon(title: string, color: string = "#8b5cf6"): string {
	// Use first letter of title as icon
	const letter = title[0]?.toUpperCase() || "P";

	const svg = `
		<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
			<rect width="144" height="144" fill="${color}" rx="8"/>
			<text
				x="50%"
				y="50%"
				font-family="Arial, sans-serif"
				font-size="60"
				font-weight="bold"
				fill="white"
				text-anchor="middle"
				dominant-baseline="central"
			>${letter}</text>
		</svg>
	`.trim();

	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

/**
 * Fetch poster image or generate fallback
 */
export async function getPosterImage(fileUrl: string | null | undefined, posterType: string, title: string, baseUrl: string = DEFAULT_BASE_URL): Promise<string> {
	// If no file URL or not an image type, generate fallback
	if (!fileUrl || posterType !== "image") {
		return generatePosterFallbackIcon(title);
	}

	try {
		// Convert relative paths to absolute URLs
		const fullUrl = fileUrl.startsWith("http") ? fileUrl : `${baseUrl}${fileUrl}`;
		
		// Try to fetch the actual poster image
		return await fetchImageAsBase64(fullUrl);
	} catch (error) {
		console.warn(`[Image Helper] Failed to fetch poster from ${fileUrl}:`, error);
		// Fallback to icon if fetch fails
		return generatePosterFallbackIcon(title);
	}
}

