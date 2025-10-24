/**
 * OBS Send Action
 * Send custom WebSocket commands to OBS
 */

import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, PropertyInspectorDidAppearEvent, SendToPluginEvent, JsonValue } from "@elgato/streamdeck";
import { obsClient } from "../utils/obs-websocket-client";

@action({ UUID: "com.julien-cruau.obslive-suite.obs.sendaction" })
export class OBSSendAction extends SingletonAction<OBSActionSettings> {
	private connectionAttempted = false;

	override async onWillAppear(ev: WillAppearEvent<OBSActionSettings>): Promise<void> {
		// Ensure OBS connection is ready
		await this.ensureConnection();
	}

	override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent<OBSActionSettings>): Promise<void> {
		// Send common OBS request types to property inspector
		await this.sendRequestTypesToPI();
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, OBSActionSettings>): Promise<void> {
		const payload = ev.payload as { event?: string };

		if (payload.event === "testConnection") {
			await this.testConnection(ev);
		} else if (payload.event === "refreshRequestTypes") {
			await this.sendRequestTypesToPI();
		}
	}

	override async onKeyDown(ev: KeyDownEvent<OBSActionSettings>): Promise<void> {
		const { requestType, requestData, password } = ev.payload.settings;

		if (!requestType) {
			await ev.action.showAlert();
			return;
		}

		try {
			// Ensure connection
			await this.ensureConnection(password);

			// Parse request data (JSON string to object)
			let parsedData: Record<string, unknown> = {};
			if (requestData) {
				try {
					parsedData = JSON.parse(requestData);
				} catch (error) {
					console.error("[OBS Send] Invalid JSON in requestData:", error);
					await ev.action.showAlert();
					return;
				}
			}

			// Send request to OBS
			console.log(`[OBS Send] Sending request: ${requestType}`, parsedData);
			const response = await obsClient.sendRequest({
				requestType,
				requestData: parsedData,
			});

			console.log("[OBS Send] Response:", response);
			await ev.action.showOk();
		} catch (error) {
			console.error("[OBS Send] Failed:", error);
			await ev.action.showAlert();
		}
	}

	/**
	 * Ensure OBS WebSocket connection is established
	 */
	private async ensureConnection(password?: string): Promise<void> {
		if (obsClient.isConnected()) {
			return;
		}

		// Only attempt connection once to avoid spam
		if (this.connectionAttempted) {
			throw new Error("OBS connection failed (already attempted)");
		}

		this.connectionAttempted = true;

		try {
			// Update password if provided
			if (password) {
				obsClient.setPassword(password);
			}

			await obsClient.connect();
			console.log("[OBS Send] Connected to OBS WebSocket");
		} catch (error) {
			this.connectionAttempted = false; // Allow retry
			throw new Error(`Failed to connect to OBS: ${(error as Error).message}`);
		}
	}

	/**
	 * Test OBS connection from property inspector
	 */
	private async testConnection(ev: SendToPluginEvent<JsonValue, OBSActionSettings>): Promise<void> {
		const settings = ev.payload as { password?: string };

		try {
			// Disconnect if already connected
			if (obsClient.isConnected()) {
				obsClient.disconnect();
				this.connectionAttempted = false;
			}

			await this.ensureConnection(settings.password);

			// Test with GetVersion request
			const response = await obsClient.sendRequest({
				requestType: "GetVersion",
			});

			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "connectionTestResult",
				success: true,
				message: `Connected to OBS v${(response.responseData?.obsVersion as string) || "unknown"}`,
			});
		} catch (error) {
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "connectionTestResult",
				success: false,
				message: (error as Error).message,
			});
		}
	}

	/**
	 * Send common OBS request types to property inspector
	 */
	private async sendRequestTypesToPI(): Promise<void> {
		const commonRequestTypes = [
			// Scenes
			{ value: "GetSceneList", label: "Get Scene List", category: "Scenes" },
			{ value: "SetCurrentProgramScene", label: "Set Current Scene", category: "Scenes", params: { sceneName: "string" } },
			{ value: "CreateScene", label: "Create Scene", category: "Scenes", params: { sceneName: "string" } },
			
			// Sources
			{ value: "GetInputList", label: "Get Input List", category: "Sources" },
			{ value: "SetInputSettings", label: "Set Input Settings", category: "Sources", params: { inputName: "string", inputSettings: "object" } },
			{ value: "GetInputSettings", label: "Get Input Settings", category: "Sources", params: { inputName: "string" } },
			{ value: "SetInputMute", label: "Set Input Mute", category: "Sources", params: { inputName: "string", inputMuted: "boolean" } },
			
			// Streaming
			{ value: "StartStream", label: "Start Streaming", category: "Streaming" },
			{ value: "StopStream", label: "Stop Streaming", category: "Streaming" },
			{ value: "ToggleStream", label: "Toggle Streaming", category: "Streaming" },
			{ value: "GetStreamStatus", label: "Get Stream Status", category: "Streaming" },
			
			// Recording
			{ value: "StartRecord", label: "Start Recording", category: "Recording" },
			{ value: "StopRecord", label: "Stop Recording", category: "Recording" },
			{ value: "ToggleRecord", label: "Toggle Recording", category: "Recording" },
			{ value: "PauseRecord", label: "Pause Recording", category: "Recording" },
			{ value: "ResumeRecord", label: "Resume Recording", category: "Recording" },
			
			// Scene Items
			{ value: "GetSceneItemList", label: "Get Scene Items", category: "Scene Items", params: { sceneName: "string" } },
			{ value: "SetSceneItemEnabled", label: "Show/Hide Scene Item", category: "Scene Items", params: { sceneName: "string", sceneItemId: "number", sceneItemEnabled: "boolean" } },
			{ value: "SetSceneItemTransform", label: "Transform Scene Item", category: "Scene Items", params: { sceneName: "string", sceneItemId: "number", sceneItemTransform: "object" } },
			
			// Filters
			{ value: "GetSourceFilterList", label: "Get Source Filters", category: "Filters", params: { sourceName: "string" } },
			{ value: "SetSourceFilterEnabled", label: "Enable/Disable Filter", category: "Filters", params: { sourceName: "string", filterName: "string", filterEnabled: "boolean" } },
			
			// General
			{ value: "GetVersion", label: "Get OBS Version", category: "General" },
			{ value: "GetStats", label: "Get OBS Stats", category: "General" },
			{ value: "BroadcastCustomEvent", label: "Broadcast Custom Event", category: "General", params: { eventData: "object" } },
			
			// Downstream Keyer (Vendor Plugin by exeldro)
			// Vendor: downstream-keyer
			// Event available: dsk_scene_changed (params: dsk_name, new_scene, old_scene)
			// Note: Vendor requests are automatically wrapped in CallVendorRequest
			{ value: "get_downstream_keyers", label: "Get Downstream Keyers", category: "Downstream Keyer" },
			{ value: "get_downstream_keyer", label: "Get Downstream Keyer Info", category: "Downstream Keyer", params: { dsk_name: "string" } },
			{ value: "dsk_select_scene", label: "DSK Select Scene", category: "Downstream Keyer", params: { dsk_name: "string", scene: "string" } },
			{ value: "dsk_add_scene", label: "DSK Add Scene", category: "Downstream Keyer", params: { dsk_name: "string", scene: "string" } },
			{ value: "dsk_remove_scene", label: "DSK Remove Scene", category: "Downstream Keyer", params: { dsk_name: "string", scene: "string" } },
			{ value: "dsk_set_tie", label: "DSK Set Tie", category: "Downstream Keyer", params: { dsk_name: "string", tie: "boolean" } },
			{ value: "dsk_set_transition", label: "DSK Set Transition", category: "Downstream Keyer", params: { dsk_name: "string", transition: "string", transition_type: "string", match: "string", show: "string", hide: "string" } },
			{ value: "dsk_add_exclude_scene", label: "DSK Add Exclude Scene", category: "Downstream Keyer", params: { dsk_name: "string", scene: "string" } },
			{ value: "dsk_remove_exclude_scene", label: "DSK Remove Exclude Scene", category: "Downstream Keyer", params: { dsk_name: "string", scene: "string" } },
		];

		await streamDeck.ui.current?.sendToPropertyInspector({
			event: "requestTypesList",
			requestTypes: commonRequestTypes,
		});
	}
}

type OBSActionSettings = {
	requestType?: string;
	requestTypeMode?: string; // 'predefined' or 'custom'
	customRequestType?: string;
	requestData?: string; // JSON string
	password?: string;
};

