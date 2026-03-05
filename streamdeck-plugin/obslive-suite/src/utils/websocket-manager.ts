/**
 * WebSocket Manager for OBS Live Suite Backend
 * Handles real-time countdown and media-player updates
 */

import WebSocket from "ws";
import { streamDeck } from "@elgato/streamdeck";
import { ConfigManager } from "./config-manager";

export interface CountdownState {
	running: boolean;
	paused: boolean;
	seconds: number;
	totalSeconds: number;
}

type CountdownCallback = (state: CountdownState) => void;

export interface MediaPlayerState {
	driverId: string;
	connected: boolean;
	playing: boolean;
	track: string;
	artist: string;
}

type MediaPlayerCallback = (driverId: string, state: MediaPlayerState) => void;

/**
 * WebSocket Manager for real-time updates
 */
export class WebSocketManager {
	private ws: WebSocket | null = null;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private readonly reconnectDelay = 3000;
	private countdownCallbacks: Set<CountdownCallback> = new Set();
	private mediaPlayerCallbacks: Set<MediaPlayerCallback> = new Set();
	private mediaPlayerStates: Map<string, MediaPlayerState> = new Map();
	private countdownState: CountdownState = {
		running: false,
		paused: false,
		seconds: 0,
		totalSeconds: 0,
	};
	private configChangeHandler: (() => void) | null = null;

	constructor() {
		// Register for config changes to reconnect when settings change
		this.configChangeHandler = () => {
			streamDeck.logger.info("[WS] Config changed, reconnecting...");
			this.reconnect();
		};
		ConfigManager.onConfigChange(this.configChangeHandler);
	}

	/**
	 * Get current WebSocket URL from ConfigManager
	 */
	private getWsUrl(): string {
		return ConfigManager.getWebSocketUrl();
	}

	/**
	 * Connect to the WebSocket server
	 */
	connect(): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			return;
		}

		const wsUrl = this.getWsUrl();

		try {
			// Create WebSocket with options for self-signed certificates
			const wsOptions: WebSocket.ClientOptions = {};
			if (ConfigManager.shouldTrustSelfSigned()) {
				wsOptions.rejectUnauthorized = false;
			}

			this.ws = new WebSocket(wsUrl, wsOptions);

			this.ws.on("open", () => {
				streamDeck.logger.info("[WS] Connected to backend");
				// Subscribe to countdown channel
				this.send({
					type: "subscribe",
					channel: "countdown",
				});
				// Subscribe to media-player channel
				this.send({
					type: "subscribe",
					channel: "media-player",
				});
			});

			this.ws.on("message", (data: Buffer) => {
				try {
					const message = JSON.parse(data.toString());
					this.handleMessage(message);
				} catch (error) {
					streamDeck.logger.error("[WS] Failed to parse message:", error);
				}
			});

			this.ws.on("close", () => {
				streamDeck.logger.info("[WS] Connection closed, reconnecting...");
				this.scheduleReconnect();
			});

			this.ws.on("error", (error) => {
				streamDeck.logger.error("[WS] Error:", error);
			});
		} catch (error) {
			streamDeck.logger.error("[WS] Connection failed:", error);
			this.scheduleReconnect();
		}
	}

	/**
	 * Schedule reconnection attempt
	 */
	private scheduleReconnect(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}
		this.reconnectTimeout = setTimeout(() => {
			this.connect();
		}, this.reconnectDelay);
	}

	/**
	 * Send data to WebSocket
	 */
	private send(data: unknown): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data));
		}
	}

	/**
	 * Handle incoming WebSocket messages
	 */
	private handleMessage(message: { channel?: string; type?: string; payload?: Record<string, unknown> }): void {
		if (message.channel === "countdown") {
			this.updateCountdownState(message);
		} else if (message.channel === "media-player") {
			this.handleMediaPlayerMessage(message);
		}
	}

	/**
	 * Update countdown state from WebSocket message
	 */
	private updateCountdownState(message: { type?: string; payload?: Record<string, unknown> }): void {
		const { type, payload } = message;
		const seconds = payload?.seconds as number | undefined;

		switch (type) {
			case "set":
				if (seconds !== undefined) {
					this.countdownState.seconds = seconds;
					this.countdownState.totalSeconds = seconds;
					this.countdownState.running = false;
					this.countdownState.paused = false;
				}
				break;
			case "start":
				this.countdownState.running = true;
				this.countdownState.paused = false;
				break;
			case "pause":
				this.countdownState.paused = true;
				break;
			case "reset":
				this.countdownState.seconds = this.countdownState.totalSeconds;
				this.countdownState.running = false;
				this.countdownState.paused = false;
				break;
			case "tick":
				if (seconds !== undefined) {
					this.countdownState.seconds = seconds;
					if (this.countdownState.seconds <= 0) {
						this.countdownState.running = false;
					}
				}
				break;
		}

		// Notify all callbacks
		this.notifyCallbacks();
	}

	/**
	 * Notify all registered callbacks
	 */
	private notifyCallbacks(): void {
		this.countdownCallbacks.forEach((callback) => {
			callback(this.countdownState);
		});
	}

	/**
	 * Register a callback for countdown updates
	 */
	onCountdownUpdate(callback: CountdownCallback): void {
		this.countdownCallbacks.add(callback);
		// Immediately call with current state
		callback(this.countdownState);
	}

	/**
	 * Unregister a callback
	 */
	offCountdownUpdate(callback: CountdownCallback): void {
		this.countdownCallbacks.delete(callback);
	}

	/**
	 * Handle incoming media-player channel messages
	 */
	private handleMediaPlayerMessage(message: { type?: string; payload?: Record<string, unknown> }): void {
		const { type, payload } = message;
		const driverId = payload?.driverId as string | undefined;

		if (!driverId) return;

		const existing = this.mediaPlayerStates.get(driverId);
		let state: MediaPlayerState | undefined;

		switch (type) {
			case "status":
				state = {
					driverId,
					connected: existing?.connected ?? true,
					playing: (payload?.playing as boolean) ?? false,
					track: (payload?.track as string) ?? "",
					artist: (payload?.artist as string) ?? "",
				};
				break;
			case "connected":
				state = {
					driverId,
					connected: true,
					playing: existing?.playing ?? false,
					track: existing?.track ?? "",
					artist: existing?.artist ?? "",
				};
				break;
			case "disconnected":
				state = { driverId, connected: false, playing: false, track: "", artist: "" };
				break;
		}

		if (state) {
			this.mediaPlayerStates.set(driverId, state);
			this.notifyMediaPlayerCallbacks(driverId);
		}
	}

	/**
	 * Notify all media-player callbacks for a specific driver
	 */
	private notifyMediaPlayerCallbacks(driverId: string): void {
		const state = this.mediaPlayerStates.get(driverId);
		if (!state) return;
		this.mediaPlayerCallbacks.forEach((callback) => {
			callback(driverId, state);
		});
	}

	/**
	 * Register a callback for media-player updates
	 */
	onMediaPlayerUpdate(callback: MediaPlayerCallback): void {
		this.mediaPlayerCallbacks.add(callback);
		// Immediately call with all existing states
		this.mediaPlayerStates.forEach((state, driverId) => {
			callback(driverId, state);
		});
	}

	/**
	 * Unregister a media-player callback
	 */
	offMediaPlayerUpdate(callback: MediaPlayerCallback): void {
		this.mediaPlayerCallbacks.delete(callback);
	}

	/**
	 * Get current media-player state for a specific driver
	 */
	getMediaPlayerState(driverId: string): MediaPlayerState | undefined {
		const state = this.mediaPlayerStates.get(driverId);
		return state ? { ...state } : undefined;
	}

	/**
	 * Get current countdown state
	 */
	getCountdownState(): CountdownState {
		return { ...this.countdownState };
	}

	/**
	 * Format countdown seconds as MM:SS
	 */
	static formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
	}

	/**
	 * Reconnect to WebSocket (disconnect and connect again)
	 * Called when configuration changes
	 */
	reconnect(): void {
		this.disconnect();
		// Small delay before reconnecting
		setTimeout(() => {
			this.connect();
		}, 100);
	}

	/**
	 * Disconnect from WebSocket
	 */
	disconnect(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}
}

// Export singleton instance
export const wsManager = new WebSocketManager();

