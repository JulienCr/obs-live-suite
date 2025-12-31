/**
 * WebSocket Manager for OBS Live Suite Backend
 * Handles real-time countdown updates
 */

import WebSocket from "ws";
import { streamDeck } from "@elgato/streamdeck";

/**
 * WebSocket port configuration
 * Uses environment variable with fallback to default port
 * This should match WS_PORT in lib/config/urls.ts of the main app
 */
const WS_PORT = process.env.WEBSOCKET_PORT || "3003";

export interface CountdownState {
	running: boolean;
	paused: boolean;
	seconds: number;
	totalSeconds: number;
}

type CountdownCallback = (state: CountdownState) => void;

/**
 * WebSocket Manager for real-time updates
 */
export class WebSocketManager {
	private ws: WebSocket | null = null;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private readonly reconnectDelay = 3000;
	private readonly wsUrl = `ws://127.0.0.1:${WS_PORT}`;
	private countdownCallbacks: Set<CountdownCallback> = new Set();
	private countdownState: CountdownState = {
		running: false,
		paused: false,
		seconds: 0,
		totalSeconds: 0,
	};

	/**
	 * Connect to the WebSocket server
	 */
	connect(): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			return;
		}

		try {
			this.ws = new WebSocket(this.wsUrl);

			this.ws.on("open", () => {
				streamDeck.logger.info("[WS] Connected to backend");
				// Subscribe to countdown channel
				this.send({
					type: "subscribe",
					channel: "countdown",
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
	private handleMessage(message: { channel?: string; type?: string; payload?: { seconds?: number } }): void {
		if (message.channel === "countdown") {
			this.updateCountdownState(message);
		}
	}

	/**
	 * Update countdown state from WebSocket message
	 */
	private updateCountdownState(message: { type?: string; payload?: { seconds?: number } }): void {
		const { type, payload } = message;

		switch (type) {
			case "set":
				if (payload?.seconds !== undefined) {
					this.countdownState.seconds = payload.seconds;
					this.countdownState.totalSeconds = payload.seconds;
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
				if (payload?.seconds !== undefined) {
					this.countdownState.seconds = payload.seconds;
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
	 * Disconnect from WebSocket
	 */
	disconnect(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}
}

// Export singleton instance
export const wsManager = new WebSocketManager();

