/**
 * OBS WebSocket Client
 * Direct connection to OBS WebSocket v5 (localhost:4455)
 */

import WebSocket from "ws";
import { streamDeck } from "@elgato/streamdeck";
import { createHash } from "crypto";

export interface OBSConnectionConfig {
	host: string;
	port: number;
	password?: string;
}

export interface OBSRequest {
	requestType: string;
	requestData?: Record<string, unknown>;
}

export interface OBSResponse {
	success: boolean;
	requestType: string;
	responseData?: Record<string, unknown>;
	error?: string;
}

/**
 * OBS WebSocket Client for Stream Deck plugin
 * Connects directly to OBS WebSocket v5 API
 */
export class OBSWebSocketClient {
	private ws: WebSocket | null = null;
	private config: OBSConnectionConfig;
	private authenticated = false;
	private requestId = 1;
	private pendingRequests: Map<number, {
		resolve: (value: OBSResponse) => void;
		reject: (reason: Error) => void;
	}> = new Map();
	private eventListeners: Map<string, Array<(data: Record<string, unknown>) => void>> = new Map();

	constructor(config: Partial<OBSConnectionConfig> = {}) {
		this.config = {
			host: config.host || "127.0.0.1",
			port: config.port || 4455,
			password: config.password  || 'aaaaaa',
		};
	}

	/**
	 * Connect to OBS WebSocket
	 */
	async connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			const wsUrl = `ws://${this.config.host}:${this.config.port}`;
			
			try {
				this.ws = new WebSocket(wsUrl);

				this.ws.on("open", () => {
					streamDeck.logger.info(`[OBS WS] Connected to ${wsUrl}`);
				});

				this.ws.on("message", async (data: Buffer) => {
					try {
						const message = JSON.parse(data.toString());
						await this.handleMessage(message, resolve, reject);
					} catch (error) {
						streamDeck.logger.error("[OBS WS] Failed to parse message:", error);
					}
				});

				this.ws.on("close", () => {
					streamDeck.logger.info("[OBS WS] Connection closed");
					this.authenticated = false;
				});

				this.ws.on("error", (error) => {
					streamDeck.logger.error("[OBS WS] Error:", error);
					reject(error);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Handle incoming WebSocket messages
	 */
	private async handleMessage(
		message: { op: number; d?: Record<string, unknown> },
		connectResolve: (value: void | PromiseLike<void>) => void,
		connectReject: (reason: Error) => void
	): Promise<void> {
		const { op, d } = message;

		switch (op) {
			case 0: // Hello
				await this.handleHello(d, connectResolve, connectReject);
				break;
			case 2: // Identified
				this.authenticated = true;
				streamDeck.logger.info("[OBS WS] Authenticated successfully");
				connectResolve();
				break;
			case 5: // Event
				this.handleEvent(d);
				break;
			case 7: // RequestResponse
				this.handleRequestResponse(d);
				break;
			default:
				streamDeck.logger.debug(`[OBS WS] Unhandled opcode: ${op}`);
		}
	}

	/**
	 * Handle Event message
	 */
	private handleEvent(d: Record<string, unknown> | undefined): void {
		if (!d) return;

		const eventType = d.eventType as string;
		const eventData = d.eventData as Record<string, unknown> | undefined;

		console.log(`[OBS WS] Event received: ${eventType}`, JSON.stringify(eventData));

		// Notify all registered listeners for this event type
		const listeners = this.eventListeners.get(eventType);
		if (listeners) {
			listeners.forEach(listener => {
				try {
					listener(eventData || {});
				} catch (error) {
					console.error(`[OBS WS] Error in event listener for ${eventType}:`, error);
				}
			});
		}

		// Also notify listeners registered for ALL events (using "*")
		const allListeners = this.eventListeners.get("*");
		if (allListeners) {
			allListeners.forEach(listener => {
				try {
					listener({ eventType, eventData: eventData || {} });
				} catch (error) {
					console.error(`[OBS WS] Error in wildcard event listener:`, error);
				}
			});
		}
	}

	/**
	 * Subscribe to an OBS event
	 */
	on(eventType: string, callback: (data: Record<string, unknown>) => void): void {
		if (!this.eventListeners.has(eventType)) {
			this.eventListeners.set(eventType, []);
		}
		this.eventListeners.get(eventType)!.push(callback);
		console.log(`[OBS WS] Registered listener for event: ${eventType}`);
	}

	/**
	 * Unsubscribe from an OBS event
	 */
	off(eventType: string, callback: (data: Record<string, unknown>) => void): void {
		const listeners = this.eventListeners.get(eventType);
		if (listeners) {
			const index = listeners.indexOf(callback);
			if (index > -1) {
				listeners.splice(index, 1);
			}
		}
	}

	/**
	 * Handle Hello message and authenticate
	 */
	private async handleHello(
		d: Record<string, unknown> | undefined,
		resolve: (value: void | PromiseLike<void>) => void,
		reject: (reason: Error) => void
	): Promise<void> {
		const authentication = d?.authentication as Record<string, unknown> | undefined;
		
		if (authentication && this.config.password) {
			// OBS WebSocket v5 authentication
			const { challenge, salt } = authentication as { challenge: string; salt: string };
			
			const secret = createHash("sha256")
				.update(this.config.password + salt)
				.digest("base64");
			
			const authResponse = createHash("sha256")
				.update(secret + challenge)
				.digest("base64");

			this.send({
				op: 1, // Identify
				d: {
					rpcVersion: 1,
					authentication: authResponse,
				},
			});
		} else {
			// No authentication required
			this.send({
				op: 1, // Identify
				d: {
					rpcVersion: 1,
				},
			});
		}
	}

	/**
	 * Handle request response
	 */
	private handleRequestResponse(d: Record<string, unknown> | undefined): void {
		if (!d) return;

		const requestId = d.requestId as number;
		const requestStatus = d.requestStatus as { result: boolean; code?: number; comment?: string };
		
		const pending = this.pendingRequests.get(requestId);
		if (!pending) return;

		this.pendingRequests.delete(requestId);

		if (requestStatus.result) {
			pending.resolve({
				success: true,
				requestType: d.requestType as string,
				responseData: d.responseData as Record<string, unknown>,
			});
		} else {
			pending.reject(new Error(requestStatus.comment || `Request failed with code ${requestStatus.code}`));
		}
	}

	/**
	 * Send data to OBS WebSocket
	 */
	private send(data: unknown): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data));
		} else {
			throw new Error("WebSocket not connected");
		}
	}

	/**
	 * Send a request to OBS
	 */
	async sendRequest(request: OBSRequest): Promise<OBSResponse> {
		if (!this.authenticated) {
			throw new Error("Not authenticated with OBS");
		}

		// Check if this is a vendor request (contains underscore, common pattern for vendor requests)
		// Vendor requests need to be wrapped in CallVendorRequest
		const isVendorRequest = this.isVendorRequest(request.requestType);

		return new Promise((resolve, reject) => {
			const requestId = this.requestId++;
			
			this.pendingRequests.set(requestId, { resolve, reject });

			try {
				let requestType = request.requestType;
				let requestData = request.requestData || {};

				// Wrap vendor requests in CallVendorRequest
				if (isVendorRequest) {
					const vendorName = this.getVendorName(request.requestType);
					requestType = "CallVendorRequest";
					requestData = {
						vendorName: vendorName,
						requestType: request.requestType,
						requestData: request.requestData || {},
					};
				}

				this.send({
					op: 6, // Request
					d: {
						requestId,
						requestType,
						requestData,
					},
				});

				// Timeout after 10 seconds
				setTimeout(() => {
					if (this.pendingRequests.has(requestId)) {
						this.pendingRequests.delete(requestId);
						reject(new Error("Request timeout"));
					}
				}, 10000);
			} catch (error) {
				this.pendingRequests.delete(requestId);
				reject(error);
			}
		});
	}

	/**
	 * Check if a request is a vendor request
	 */
	private isVendorRequest(requestType: string): boolean {
		// Vendor requests typically start with lowercase and contain underscores
		// Standard OBS requests use PascalCase
		return /^[a-z_]+$/.test(requestType);
	}

	/**
	 * Get vendor name for a vendor request
	 */
	private getVendorName(requestType: string): string {
		// Map known vendor request prefixes to vendor names
		if (requestType.startsWith("dsk_") || requestType === "get_downstream_keyers" || requestType === "get_downstream_keyer") {
			return "downstream-keyer";
		}
		
		// Default to extracting prefix before first underscore
		const match = requestType.match(/^([a-z]+)_/);
		return match ? match[1] : "unknown-vendor";
	}

	/**
	 * Disconnect from OBS WebSocket
	 */
	disconnect(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.authenticated = false;
		this.pendingRequests.clear();
	}

	/**
	 * Check if connected and authenticated
	 */
	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.authenticated;
	}

	/**
	 * Update connection password
	 */
	setPassword(password?: string): void {
		this.config.password = password;
	}
}

// Export singleton instance with default config
export const obsClient = new OBSWebSocketClient();

