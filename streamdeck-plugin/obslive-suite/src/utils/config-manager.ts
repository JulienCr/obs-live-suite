/**
 * Configuration Manager for OBS Live Suite Stream Deck Plugin
 * Handles global settings for server connection configuration
 */

import { streamDeck } from "@elgato/streamdeck";

/**
 * Global configuration for server connection
 */
export interface GlobalConfig {
	host: string;            // Server hostname (default: "localhost")
	port: number;            // Base port (default: 3000)
	useHttps: boolean;       // Use HTTPS/WSS (default: true)
	trustSelfSigned: boolean; // Accept self-signed certificates (default: true)
	[key: string]: string | number | boolean; // Index signature for JSON compatibility
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: GlobalConfig = {
	host: "localhost",
	port: 3000,
	useHttps: true,
	trustSelfSigned: true,
};

type ConfigChangeCallback = () => void;

/**
 * Configuration Manager Singleton
 * Manages global settings for server connection and provides URL builders
 */
class ConfigManagerClass {
	private config: GlobalConfig = { ...DEFAULT_CONFIG };
	private initialized = false;
	private changeCallbacks: Set<ConfigChangeCallback> = new Set();

	/**
	 * Initialize configuration from Stream Deck global settings
	 * Must be called before using other methods
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			const globalSettings = await streamDeck.settings.getGlobalSettings<Partial<GlobalConfig>>();

			// Merge with defaults (in case some settings are missing)
			this.config = {
				host: globalSettings.host ?? DEFAULT_CONFIG.host,
				port: Number(globalSettings.port) || DEFAULT_CONFIG.port,
				useHttps: globalSettings.useHttps ?? DEFAULT_CONFIG.useHttps,
				trustSelfSigned: globalSettings.trustSelfSigned ?? DEFAULT_CONFIG.trustSelfSigned,
			};

			streamDeck.logger.info(`[ConfigManager] Initialized with: ${this.config.host}:${this.config.port} (HTTPS: ${this.config.useHttps})`);
			this.initialized = true;
		} catch (error) {
			streamDeck.logger.error("[ConfigManager] Failed to load global settings:", error);
			// Use defaults on error
			this.config = {
				host: DEFAULT_CONFIG.host,
				port: DEFAULT_CONFIG.port,
				useHttps: DEFAULT_CONFIG.useHttps,
				trustSelfSigned: DEFAULT_CONFIG.trustSelfSigned,
			};
			this.initialized = true;
		}
	}

	/**
	 * Get current configuration
	 */
	getConfig(): GlobalConfig {
		return { ...this.config };
	}

	/**
	 * Update configuration and persist to global settings
	 */
	async updateConfig(partial: Partial<GlobalConfig>): Promise<void> {
		const oldConfig = { ...this.config };

		// Merge new values with explicit assignment for type safety
		this.config = {
			host: partial.host ?? this.config.host,
			port: Number(partial.port ?? this.config.port) || DEFAULT_CONFIG.port,
			useHttps: partial.useHttps ?? this.config.useHttps,
			trustSelfSigned: partial.trustSelfSigned ?? this.config.trustSelfSigned,
		};

		try {
			await streamDeck.settings.setGlobalSettings(this.config);
			streamDeck.logger.info(`[ConfigManager] Config updated: ${this.config.host}:${this.config.port} (HTTPS: ${this.config.useHttps})`);

			// Notify listeners if connection-related settings changed
			if (
				oldConfig.host !== this.config.host ||
				oldConfig.port !== this.config.port ||
				oldConfig.useHttps !== this.config.useHttps
			) {
				this.notifyChange();
			}
		} catch (error) {
			streamDeck.logger.error("[ConfigManager] Failed to save global settings:", error);
			throw error;
		}
	}

	/**
	 * Get HTTP protocol based on config
	 */
	getHttpProtocol(): "http" | "https" {
		return this.config.useHttps ? "https" : "http";
	}

	/**
	 * Get WebSocket protocol based on config
	 */
	getWsProtocol(): "ws" | "wss" {
		return this.config.useHttps ? "wss" : "ws";
	}

	/**
	 * Get Next.js app URL (base port)
	 */
	getNextjsUrl(): string {
		return `${this.getHttpProtocol()}://${this.config.host}:${this.config.port}`;
	}

	/**
	 * Get Backend API URL (base port + 2)
	 */
	getBackendUrl(): string {
		const backendPort = this.config.port + 2;
		return `${this.getHttpProtocol()}://${this.config.host}:${backendPort}`;
	}

	/**
	 * Get WebSocket URL (base port + 3)
	 */
	getWebSocketUrl(): string {
		const wsPort = this.config.port + 3;
		return `${this.getWsProtocol()}://${this.config.host}:${wsPort}`;
	}

	/**
	 * Get all computed URLs
	 */
	getUrls(): { nextjs: string; backend: string; websocket: string } {
		return {
			nextjs: this.getNextjsUrl(),
			backend: this.getBackendUrl(),
			websocket: this.getWebSocketUrl(),
		};
	}

	/**
	 * Check if self-signed certificates should be trusted
	 */
	shouldTrustSelfSigned(): boolean {
		return this.config.trustSelfSigned;
	}

	/**
	 * Register callback for configuration changes
	 */
	onConfigChange(callback: ConfigChangeCallback): void {
		this.changeCallbacks.add(callback);
	}

	/**
	 * Unregister callback
	 */
	offConfigChange(callback: ConfigChangeCallback): void {
		this.changeCallbacks.delete(callback);
	}

	/**
	 * Notify all listeners of configuration change
	 */
	private notifyChange(): void {
		this.changeCallbacks.forEach((callback) => {
			try {
				callback();
			} catch (error) {
				streamDeck.logger.error("[ConfigManager] Error in change callback:", error);
			}
		});
	}

	/**
	 * Reset to default configuration
	 */
	async resetToDefaults(): Promise<void> {
		await this.updateConfig(DEFAULT_CONFIG);
	}
}

// Export singleton instance
export const ConfigManager = new ConfigManagerClass();
