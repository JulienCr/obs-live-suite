/**
 * Setup Connection Action
 * Configure the connection to OBS Live Suite server
 */

import streamDeck, {
	action,
	SingletonAction,
	PropertyInspectorDidAppearEvent,
	SendToPluginEvent,
	JsonValue,
	WillAppearEvent,
	Action,
} from "@elgato/streamdeck";
import { ConfigManager, GlobalConfig } from "../utils/config-manager";
import { testConnection } from "../utils/api-client";

type SetupSettings = Record<string, never>; // No per-button settings needed

interface SetupMessage {
	event: string;
	config?: Partial<GlobalConfig>;
}

@action({ UUID: "com.julien-cruau.obslive-suite.setup" })
export class SetupConnection extends SingletonAction<SetupSettings> {
	private actionInstances: Map<string, Action<SetupSettings>> = new Map();

	override async onWillAppear(ev: WillAppearEvent<SetupSettings>): Promise<void> {
		this.actionInstances.set(ev.action.id, ev.action);

		// Update button to show current connection status
		await this.updateButtonStatus(ev.action);
	}

	override async onPropertyInspectorDidAppear(
		ev: PropertyInspectorDidAppearEvent<SetupSettings>
	): Promise<void> {
		streamDeck.logger.info("[Setup] Property Inspector appeared");
		await this.sendConfigToPI();
	}

	override async onSendToPlugin(
		ev: SendToPluginEvent<JsonValue, SetupSettings>
	): Promise<void> {
		const payload = ev.payload as unknown as SetupMessage;
		streamDeck.logger.info(`[Setup] Received event: ${payload.event}`);

		switch (payload.event) {
			case "getConfig":
				await this.sendConfigToPI();
				break;

			case "saveConfig":
				if (payload.config) {
					await this.saveConfig(payload.config);
				}
				break;

			case "testConnection":
				await this.handleTestConnection();
				break;

			default:
				streamDeck.logger.warn(`[Setup] Unknown event: ${payload.event}`);
		}
	}

	/**
	 * Send current configuration to Property Inspector
	 */
	private async sendConfigToPI(): Promise<void> {
		try {
			const config = ConfigManager.getConfig();
			const urls = ConfigManager.getUrls();

			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "configLoaded",
				config,
				urls,
			});

			streamDeck.logger.info("[Setup] Sent config to PI");
		} catch (error) {
			streamDeck.logger.error("[Setup] Failed to send config:", error);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "error",
				message: `Failed to load config: ${(error as Error).message}`,
			});
		}
	}

	/**
	 * Save new configuration
	 */
	private async saveConfig(newConfig: Partial<GlobalConfig>): Promise<void> {
		try {
			await ConfigManager.updateConfig(newConfig);

			// Send updated config back to PI
			const config = ConfigManager.getConfig();
			const urls = ConfigManager.getUrls();

			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "configSaved",
				config,
				urls,
			});

			// Update all button statuses
			await this.updateAllButtonStatuses();

			streamDeck.logger.info("[Setup] Config saved successfully");
		} catch (error) {
			streamDeck.logger.error("[Setup] Failed to save config:", error);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "error",
				message: `Failed to save config: ${(error as Error).message}`,
			});
		}
	}

	/**
	 * Test connection to the backend server
	 */
	private async handleTestConnection(): Promise<void> {
		try {
			streamDeck.logger.info("[Setup] Testing connection...");

			const result = await testConnection();

			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "testResult",
				...result,
			});

			streamDeck.logger.info(`[Setup] Test result: ${result.success ? "OK" : "FAILED"}`);
		} catch (error) {
			streamDeck.logger.error("[Setup] Test connection error:", error);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "testResult",
				success: false,
				error: (error as Error).message,
			});
		}
	}

	/**
	 * Update button status to show connection state
	 */
	private async updateButtonStatus(actionInstance: Action<SetupSettings>): Promise<void> {
		if (!actionInstance.isKey()) return;

		try {
			// Quick test to see if server is reachable
			const result = await testConnection();

			if (result.success) {
				await actionInstance.setTitle("SETUP\nOK");
			} else {
				await actionInstance.setTitle("SETUP\n---");
			}
		} catch {
			await actionInstance.setTitle("SETUP\n---");
		}
	}

	/**
	 * Update all button instances
	 */
	private async updateAllButtonStatuses(): Promise<void> {
		for (const [, actionInstance] of this.actionInstances) {
			await this.updateButtonStatus(actionInstance);
		}
	}
}
