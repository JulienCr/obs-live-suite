/**
 * Image Helper Utilities
 * Handles image fetching and conversion for Stream Deck buttons
 */

import http from "http";
import https from "https";
import { ConfigManager } from "./config-manager";

/**
 * Get default base URL from ConfigManager
 */
function getDefaultBaseUrl(): string {
	return ConfigManager.getNextjsUrl();
}

/**
 * Fetch an image from a URL and convert to base64 data URI
 * Supports self-signed certificates based on ConfigManager settings
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		try {
			const urlObj = new URL(url);
			const isHttps = urlObj.protocol === "https:";
			const client = isHttps ? https : http;

			const requestOptions: http.RequestOptions | https.RequestOptions = {
				hostname: urlObj.hostname,
				port: urlObj.port || (isHttps ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: "GET",
				timeout: 5000, // 5 second timeout
			};

			// For HTTPS, handle self-signed certificates
			if (isHttps && ConfigManager.shouldTrustSelfSigned()) {
				(requestOptions as https.RequestOptions).rejectUnauthorized = false;
			}

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
export async function getGuestAvatar(avatarUrl: string | null | undefined, displayName: string, baseUrl?: string): Promise<string> {
	const effectiveBaseUrl = baseUrl || getDefaultBaseUrl();
	// If no avatar URL, generate initials
	if (!avatarUrl) {
		return generateInitialsAvatar(displayName);
	}

	try {
		// Convert relative paths to absolute URLs
		const fullUrl = avatarUrl.startsWith("http") ? avatarUrl : `${effectiveBaseUrl}${avatarUrl}`;
		
		// Try to fetch the actual avatar
		return await fetchImageAsBase64(fullUrl);
	} catch (error) {
		console.warn(`[Image Helper] Failed to fetch avatar from ${avatarUrl}:`, error);
		// Fallback to initials if fetch fails
		return generateInitialsAvatar(displayName);
	}
}

/**
 * Generate a grayed out video icon for video/youtube posters
 */
export function generateVideoIcon(): string {
	const svg = `
		<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
			<rect width="144" height="144" fill="#2a2a2a" rx="8"/>
			<rect x="30" y="40" width="84" height="64" rx="6" fill="#444"/>
			<polygon points="60,55 60,89 90,72" fill="#666"/>
		</svg>
	`.trim();

	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate a grayed out guest icon (person silhouette) for empty guest slots
 */
export function generateGrayedGuestIcon(): string {
	const svg = `
		<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
			<rect width="144" height="144" fill="#1a1a1a" rx="8"/>
			<circle cx="72" cy="55" r="20" fill="#444"/>
			<path d="M 40 90 Q 72 70, 104 90" stroke="#444" stroke-width="8" fill="none" stroke-linecap="round"/>
			<rect x="30" y="100" width="84" height="8" rx="4" fill="#444"/>
			<rect x="45" y="112" width="54" height="6" rx="3" fill="#3a3a3a"/>
		</svg>
	`.trim();

	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generate a grayed out poster icon (landscape/image) for empty poster slots
 */
export function generateGrayedPosterIcon(): string {
	const svg = `
		<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg">
			<rect width="144" height="144" fill="#1a1a1a" rx="8"/>
			<rect x="30" y="35" width="84" height="74" rx="6" stroke="#444" stroke-width="4" fill="none"/>
			<circle cx="50" cy="60" r="8" fill="#444"/>
			<path d="M 30 95 L 50 75 L 70 90 L 95 60 L 114 80 L 114 109 L 30 109 Z" fill="#444" opacity="0.6"/>
		</svg>
	`.trim();

	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
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
export async function getPosterImage(fileUrl: string | null | undefined, posterType: string, title: string, baseUrl?: string): Promise<string> {
	const effectiveBaseUrl = baseUrl || getDefaultBaseUrl();
	// If no file URL or not an image type, generate fallback
	if (!fileUrl || posterType !== "image") {
		return generatePosterFallbackIcon(title);
	}

	try {
		// Convert relative paths to absolute URLs
		const fullUrl = fileUrl.startsWith("http") ? fileUrl : `${effectiveBaseUrl}${fileUrl}`;
		
		// Try to fetch the actual poster image
		return await fetchImageAsBase64(fullUrl);
	} catch (error) {
		console.warn(`[Image Helper] Failed to fetch poster from ${fileUrl}:`, error);
		// Fallback to icon if fetch fails
		return generatePosterFallbackIcon(title);
	}
}

