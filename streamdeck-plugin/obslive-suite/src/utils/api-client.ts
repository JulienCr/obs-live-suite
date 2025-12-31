/**
 * API Client for OBS Live Suite Backend
 * Handles HTTP requests to the Next.js API and Backend server
 */

import http from "http";
import https from "https";

export interface Guest {
	id: string;
	displayName: string;
	subtitle?: string;
	avatarUrl?: string | null;
	isEnabled: boolean;
	[key: string]: string | boolean | undefined | null;
}

export interface Poster {
	id: string;
	title: string;
	fileUrl: string;
	type: "image" | "video" | "youtube";
	isEnabled: boolean;
	[key: string]: string | boolean | undefined;
}

/**
 * Configuration for API endpoints
 * Uses environment variables with fallback to default ports
 * These should match the ports in lib/config/urls.ts of the main app
 */
const APP_PORT = process.env.APP_PORT || "3000";
const BACKEND_PORT = process.env.BACKEND_PORT || "3002";

export const API_CONFIG = {
	nextjs: `http://127.0.0.1:${APP_PORT}`,
	backend: `http://127.0.0.1:${BACKEND_PORT}`,
};

/**
 * Makes an HTTP/HTTPS request and returns parsed JSON
 */
async function request<T>(url: string, options: { method?: string; body?: string } = {}): Promise<T> {
	return new Promise((resolve, reject) => {
		try {
			const urlObj = new URL(url);
			const isHttps = urlObj.protocol === "https:";
			const client = isHttps ? https : http;

			const requestOptions: http.RequestOptions = {
				hostname: urlObj.hostname,
				port: urlObj.port || (isHttps ? 443 : 80),
				path: urlObj.pathname + urlObj.search,
				method: options.method || "GET",
				headers: {
					"Content-Type": "application/json",
					...(options.body ? { "Content-Length": Buffer.byteLength(options.body) } : {}),
				},
			};

			const req = client.request(requestOptions, (res) => {
				let data = "";

				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const jsonData = JSON.parse(data);
							resolve(jsonData);
						} catch (error) {
							reject(new Error(`Failed to parse response: ${(error as Error).message}`));
						}
					} else {
						reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
					}
				});
			});

			req.on("error", (error) => {
				reject(error);
			});

			if (options.body) {
				req.write(options.body);
			}

			req.end();
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * API Client class
 */
export class APIClient {
	/**
	 * Fetch all guests from the database (only enabled guests)
	 */
	static async getGuests(): Promise<Guest[]> {
		try {
			const data = await request<{ guests: Guest[] }>(`${API_CONFIG.nextjs}/api/assets/guests`);
			const guests = Array.isArray(data.guests) ? data.guests : [];
			// Filter to show only enabled guests in Stream Deck dropdowns
			return guests.filter((guest) => guest.isEnabled !== false);
		} catch (error) {
			console.error("[API] Failed to fetch guests:", error);
			return [];
		}
	}

	/**
	 * Fetch all posters from the database (only enabled posters)
	 */
	static async getPosters(): Promise<Poster[]> {
		try {
			const data = await request<{ posters: Poster[] }>(`${API_CONFIG.nextjs}/api/assets/posters`);
			const posters = Array.isArray(data.posters) ? data.posters : [];
			// Filter to show only enabled posters in Stream Deck dropdowns
			return posters.filter((poster) => poster.isEnabled !== false);
		} catch (error) {
			console.error("[API] Failed to fetch posters:", error);
			return [];
		}
	}

	/**
	 * Show a guest lower third
	 */
	static async showGuestLowerThird(guestId: string, side: string, duration: number): Promise<void> {
		await request(`${API_CONFIG.nextjs}/api/actions/lower/guest/${guestId}`, {
			method: "POST",
			body: JSON.stringify({ side, duration }),
		});
	}

	/**
	 * Show a custom lower third
	 */
	static async showCustomLowerThird(title: string, subtitle: string, side: string, duration: number): Promise<void> {
		await request(`${API_CONFIG.nextjs}/api/actions/lower/show`, {
			method: "POST",
			body: JSON.stringify({ title, subtitle, side, duration }),
		});
	}

	/**
	 * Hide lower third
	 */
	static async hideLowerThird(): Promise<void> {
		await request(`${API_CONFIG.nextjs}/api/actions/lower/hide`, {
			method: "POST",
		});
	}

	/**
	 * Start countdown
	 */
	static async startCountdown(seconds: number): Promise<void> {
		await request(`${API_CONFIG.nextjs}/api/actions/countdown/start`, {
			method: "POST",
			body: JSON.stringify({ seconds }),
		});
	}

	/**
	 * Control countdown (pause, start, reset)
	 */
	static async controlCountdown(action: string): Promise<void> {
		await request(`${API_CONFIG.backend}/api/overlays/countdown`, {
			method: "POST",
			body: JSON.stringify({ action }),
		});
	}

	/**
	 * Add time to countdown
	 */
	static async addCountdownTime(seconds: number): Promise<void> {
		await request(`${API_CONFIG.backend}/api/overlays/countdown`, {
			method: "POST",
			body: JSON.stringify({ action: "add-time", payload: { seconds } }),
		});
	}

	/**
	 * Show a poster
	 */
	static async showPoster(posterId: string): Promise<void> {
		await request(`${API_CONFIG.nextjs}/api/actions/poster/show/${posterId}`, {
			method: "POST",
		});
	}

	/**
	 * Control poster (hide, next, previous)
	 */
	static async controlPoster(action: string): Promise<void> {
		await request(`${API_CONFIG.nextjs}/api/actions/poster/${action}`, {
			method: "POST",
		});
	}
}

