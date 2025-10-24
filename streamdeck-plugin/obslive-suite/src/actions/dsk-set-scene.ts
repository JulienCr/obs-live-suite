/**
 * DSK Set Scene Action
 * Control Downstream Keyer scene selection with toggle and state display
 */

import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, PropertyInspectorDidAppearEvent, SendToPluginEvent, JsonValue, Action, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { obsClient } from "../utils/obs-websocket-client";
import { Buffer } from "buffer";

interface DSKSceneInfo {
	dskName: string;
	currentScene: string;
	scenes: string[];
}

@action({ UUID: "com.julien-cruau.obslive-suite.dsk.setscene" })
export class DSKSetScene extends SingletonAction<DSKSettings> {
	private actionInstances: Map<string, Action<DSKSettings>> = new Map();
	private connectionAttempted = false;
	private sceneCache: Map<string, DSKSceneInfo> = new Map();
	// Track the last known active scene per DSK (set after successful requests)
	private dskCurrentSceneByName: Map<string, string> = new Map();

	override async onWillAppear(ev: WillAppearEvent<DSKSettings>): Promise<void> {
		// Track this action instance
		this.actionInstances.set(ev.action.id, ev.action);

		// If we already know the current scene for this DSK, show correct state immediately
		try {
			const settings = await ev.action.getSettings();
			const current = settings?.dskName ? this.dskCurrentSceneByName.get(settings.dskName) : undefined;
			if (ev.action.isKey()) {
				if (current && settings?.scene) {
					await ev.action.setState(settings.scene === current ? 1 : 0);
				} else {
					// Default to inactive (0) when unknown
					await ev.action.setState(0);
				}
			}
		} catch {
			// Best-effort default state
			if (ev.action.isKey()) {
				await ev.action.setState(0);
			}
		}
	}

	override onWillDisappear(ev: WillDisappearEvent<DSKSettings>): void {
		// Remove this action instance
		this.actionInstances.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<DSKSettings>): Promise<void> {
		// When user changes selection in PI, reflect cached current scene if available
		const { dskName, scene } = ev.payload.settings;
		const current = dskName ? this.dskCurrentSceneByName.get(dskName) : undefined;
		if (ev.action.isKey()) {
			await ev.action.setState(current && scene ? (scene === current ? 1 : 0) : 0);
		}
	}

	override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent<DSKSettings>): Promise<void> {
		// Send DSK list to property inspector when it appears
		await this.sendDSKInfoToPI();
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, DSKSettings>): Promise<void> {
		const payload = ev.payload as { event?: string; dskName?: string };
		console.log("[DSK Set Scene] Received sendToPlugin event:", payload);

		if (payload.event === "refreshDSKs") {
			console.log("[DSK Set Scene] Handling refreshDSKs event");
			await this.sendDSKInfoToPI();
		} else if (payload.event === "getDSKScenes" && payload.dskName) {
			console.log(`[DSK Set Scene] Handling getDSKScenes event for: ${payload.dskName}`);
			await this.sendDSKScenesForDSK(payload.dskName);
		} else if (payload.event === "testDSK") {
			console.log("[DSK Set Scene] Handling testDSK event");
			await this.testDSKCommunication();
		}
	}

	override async onKeyDown(ev: KeyDownEvent<DSKSettings>): Promise<void> {
		const { dskName, scene } = ev.payload.settings;

		streamDeck.logger.info(`[DSK Set Scene] Button pressed - DSK: "${dskName}", Scene: "${scene}"`);

		if (!dskName || !scene) {
			streamDeck.logger.info("[DSK Set Scene] Missing DSK name or scene name");
			await ev.action.showAlert();
			return;
		}

		try {
			// Ensure connection
			await this.ensureConnection();

			// Send scene change request (don't query OBS first - it has a caching bug)
			streamDeck.logger.info(`[DSK Set Scene] Selecting scene "${scene}" on "${dskName}"`);
			streamDeck.logger.info(`[DSK Set Scene] Request data: ${JSON.stringify({ dsk_name: dskName, scene })}`);
			
			const response = await obsClient.sendRequest({
				requestType: "dsk_select_scene",
				requestData: { dsk_name: dskName, scene },
			});
			
			streamDeck.logger.info(`[DSK Set Scene] Response: ${JSON.stringify(response)}`);
			
			// If successful, immediately update ALL buttons for this DSK
			// Don't query OBS - trust the request succeeded
			if (response.success) {
				streamDeck.logger.info(`[DSK Set Scene] Scene change successful, updating all buttons`);
				await this.updateAllButtonsForDSK(dskName, scene);
			}

			await ev.action.showOk();
		} catch (error) {
			streamDeck.logger.error(`[DSK Set Scene] Failed: ${(error as Error).message}`);
			await ev.action.showAlert();
		}
	}

	/**
	 * Update all button states for a specific DSK
	 */
	private async updateAllButtonsForDSK(dskName: string, currentScene: string): Promise<void> {
		streamDeck.logger.info(`[DSK Set Scene] Updating all buttons for DSK: "${dskName}", current scene: "${currentScene}"`);
		streamDeck.logger.info(`[DSK Set Scene] Current scene bytes: ${Buffer.from(currentScene).toString('hex')}`);
		streamDeck.logger.info(`[DSK Set Scene] Total action instances: ${this.actionInstances.size}`);

		// Cache the current scene for this DSK so new buttons can reflect state immediately
		this.dskCurrentSceneByName.set(dskName, currentScene);

		for (const [id, actionInstance] of this.actionInstances.entries()) {
			const settings = await actionInstance.getSettings();
			
			// Only update buttons for this DSK
			if (settings.dskName === dskName) {
				const isActive = settings.scene === currentScene;
				streamDeck.logger.info(`[DSK Set Scene] Button ${id}: scene="${settings.scene}" (bytes: ${Buffer.from(settings.scene || '').toString('hex')}), isActive=${isActive}, setting state to ${isActive ? 1 : 0}`);
				
				if (actionInstance.isKey()) {
					await actionInstance.setState(isActive ? 1 : 0);
					streamDeck.logger.info(`[DSK Set Scene] Button ${id} state set successfully`);
				}
			}
		}
	}

	/**
	 * Ensure OBS WebSocket connection
	 */
	private async ensureConnection(): Promise<void> {
		if (obsClient.isConnected()) {
			return;
		}

		if (this.connectionAttempted) {
			throw new Error("OBS connection failed (already attempted)");
		}

		this.connectionAttempted = true;

		try {
			await obsClient.connect();
			console.log("[DSK Set Scene] Connected to OBS WebSocket");
		} catch (error) {
			this.connectionAttempted = false;
			throw new Error(`Failed to connect to OBS: ${(error as Error).message}`);
		}
	}

	/**
	 * Get DSK info from OBS
	 */
	private async getDSKInfo(dskName: string): Promise<DSKSceneInfo> {
		try {
			streamDeck.logger.info(`[DSK Set Scene] === getDSKInfo START for: ${dskName} ===`);
			const response = await obsClient.sendRequest({
				requestType: "get_downstream_keyer",
				requestData: { dsk_name: dskName },
			});

			streamDeck.logger.info(`[DSK Set Scene] RAW RESPONSE: ${JSON.stringify(response)}`);
			
			// Vendor requests return nested responseData
			const nestedData = response.responseData?.responseData as Record<string, unknown> | undefined;
			streamDeck.logger.info(`[DSK Set Scene] NESTED DATA: ${JSON.stringify(nestedData)}`);

			// Extract current scene (property name is "scene" not "current_scene")
			const currentScene = (nestedData?.scene as string) || "";
			streamDeck.logger.info(`[DSK Set Scene] EXTRACTED current scene: "${currentScene}"`);
			
			// Extract scenes array (array of objects with "name" property)
			const scenesArray = (nestedData?.scenes as Array<{ name: string }>) || [];
			const scenes = scenesArray.map(scene => scene.name);
			streamDeck.logger.info(`[DSK Set Scene] EXTRACTED scenes: ${JSON.stringify(scenes)}`);
			
			const result = {
				dskName,
				currentScene,
				scenes,
			};
			streamDeck.logger.info(`[DSK Set Scene] === getDSKInfo END: ${JSON.stringify(result)} ===`);
			return result;
		} catch (error) {
			streamDeck.logger.error(`[DSK Set Scene] Failed to get DSK info for ${dskName}: ${(error as Error).message}`);
			return { dskName, currentScene: "", scenes: [] };
		}
	}

	/**
	 * Send DSK list to property inspector
	 */
	private async sendDSKInfoToPI(): Promise<void> {
		try {
			console.log("[DSK Set Scene] Fetching DSK list...");
			await this.ensureConnection();

			console.log("[DSK Set Scene] Sending get_downstream_keyers request...");
			const response = await obsClient.sendRequest({
				requestType: "get_downstream_keyers",
			});

			console.log("[DSK Set Scene] Response received:", JSON.stringify(response));
			console.log("[DSK Set Scene] Response data:", response.responseData);

			// Vendor requests return nested responseData
			const nestedData = response.responseData?.responseData as Record<string, unknown> | undefined;
			console.log("[DSK Set Scene] Nested response data:", nestedData);

			const downstreamKeyers = (nestedData?.downstream_keyers as Array<{ name: string }>) || [];
			console.log("[DSK Set Scene] Downstream keyers objects:", downstreamKeyers);

			// Extract just the names
			const dskList = downstreamKeyers.map(dsk => dsk.name);
			console.log("[DSK Set Scene] Extracted DSK list:", dskList);

			console.log("[DSK Set Scene] Sending DSK list to property inspector...");
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "dsksList",
				dsks: dskList,
			});
			console.log("[DSK Set Scene] DSK list sent successfully");
		} catch (error) {
			console.error("[DSK Set Scene] Failed to get DSK list:", error);
			console.error("[DSK Set Scene] Error details:", (error as Error).stack);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "apiError",
				message: `Failed to get DSK list: ${(error as Error).message}`,
			});
		}
	}

	/**
	 * Send scenes for a specific DSK to property inspector
	 */
	private async sendDSKScenesForDSK(dskName: string): Promise<void> {
		try {
			console.log(`[DSK Set Scene] Fetching scenes for DSK: ${dskName}`);
			await this.ensureConnection();

			const dskInfo = await this.getDSKInfo(dskName);
			console.log(`[DSK Set Scene] DSK info for ${dskName}:`, dskInfo);

			console.log(`[DSK Set Scene] Sending scenes list to property inspector...`);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "dskScenesList",
				dskName,
				scenes: dskInfo.scenes,
				currentScene: dskInfo.currentScene,
			});
			console.log(`[DSK Set Scene] Scenes list sent successfully`);
		} catch (error) {
			console.error(`[DSK Set Scene] Failed to get scenes for ${dskName}:`, error);
			console.error(`[DSK Set Scene] Error details:`, (error as Error).stack);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "apiError",
				message: `Failed to get scenes for ${dskName}: ${(error as Error).message}`,
			});
		}
	}

	/**
	 * Test DSK communication and show raw responses
	 */
	private async testDSKCommunication(): Promise<void> {
		try {
			console.log("[DSK Set Scene TEST] Starting communication test...");
			await this.ensureConnection();

			// Test 1: Get downstream keyers
			console.log("[DSK Set Scene TEST] Test 1: get_downstream_keyers");
			const response1 = await obsClient.sendRequest({
				requestType: "get_downstream_keyers",
			});
			console.log("[DSK Set Scene TEST] Raw response:", response1);

			// Use Record<string, any> to allow dynamic properties
			const testResults: Record<string, any> = {
				test1_get_downstream_keyers: {
					success: response1.success,
					requestType: response1.requestType,
					responseData: response1.responseData || {},
					fullResponse: JSON.parse(JSON.stringify(response1)), // Ensure JSON-serializable
				},
			};

			// If we have DSKs, test getting info for first one
			const nestedData = response1.responseData?.responseData as Record<string, unknown> | undefined;
			const downstreamKeyers = (nestedData?.downstream_keyers as Array<{ name: string }>) || [];
			const dskNames = downstreamKeyers.map(dsk => dsk.name);
			
			if (dskNames.length > 0) {
				console.log(`[DSK Set Scene TEST] Test 2: get_downstream_keyer for: ${dskNames[0]}`);
				const response2 = await obsClient.sendRequest({
					requestType: "get_downstream_keyer",
					requestData: { dsk_name: dskNames[0] },
				});
				console.log("[DSK Set Scene TEST] Raw response:", response2);

				testResults.test2_get_downstream_keyer = {
					dsk_name: dskNames[0],
					success: response2.success,
					requestType: response2.requestType,
					responseData: response2.responseData || {},
					fullResponse: JSON.parse(JSON.stringify(response2)),
				};
			} else {
				testResults.test2_get_downstream_keyer = {
					error: "No DSKs found in test 1",
					downstreamKeyers: JSON.parse(JSON.stringify(downstreamKeyers)),
					dskNames,
				};
			}

			// Send results to property inspector (cast to JsonValue for type safety)
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "debugResponse",
				data: JSON.parse(JSON.stringify(testResults)) as JsonValue,
			});

			console.log("[DSK Set Scene TEST] Test complete:", testResults);
		} catch (error) {
			console.error("[DSK Set Scene TEST] Test failed:", error);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "debugResponse",
				data: {
					error: (error as Error).message,
					stack: (error as Error).stack || "",
				} as JsonValue,
			});
		}
	}

	/**
	 * Update button state based on whether the scene is active
	 */
	private async updateButtonState(actionInstance: Action<DSKSettings>, settings: DSKSettings): Promise<void> {
		const { dskName, scene } = settings;

		console.log(`[DSK Set Scene] Updating button state for DSK: ${dskName}, Scene: ${scene}`);

		if (!dskName || !scene) {
			// No selection, use default state
			console.log("[DSK Set Scene] No DSK or scene selected, setting state to 0");
			if (actionInstance.isKey()) {
				await actionInstance.setState(0);
			}
			return;
		}

		try {
			await this.ensureConnection();

			const dskInfo = await this.getDSKInfo(dskName);
			console.log(`[DSK Set Scene] Current DSK scene: ${dskInfo.currentScene}, Selected scene: ${scene}`);

			// Set state based on whether this scene is currently active
			const isActive = dskInfo.currentScene === scene;
			console.log(`[DSK Set Scene] Is active: ${isActive}, setting state to ${isActive ? 1 : 0}`);
			
			if (actionInstance.isKey()) {
				await actionInstance.setState(isActive ? 1 : 0);
				console.log(`[DSK Set Scene] State set successfully to ${isActive ? 1 : 0}`);
			}
		} catch (error) {
			console.error("[DSK Set Scene] Failed to update button state:", error);
			console.error("[DSK Set Scene] Error details:", (error as Error).stack);
			// On error, default to inactive state
			if (actionInstance.isKey()) {
				await actionInstance.setState(0);
			}
		}
	}
}

type DSKSettings = {
	dskName?: string;
	scene?: string;
};

