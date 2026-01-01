/**
 * Scene Switch Action
 * Switch to a specific OBS scene with active state indicator
 */

import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, Action, DidReceiveSettingsEvent, SendToPluginEvent, JsonValue, PropertyInspectorDidAppearEvent } from "@elgato/streamdeck";
import { obsClient } from "../utils/obs-websocket-client";

type SceneSettings = {
	sceneName?: string;
	obsPassword?: string;
	[key: string]: string | undefined;
};

@action({ UUID: "com.julien-cruau.obslive-suite.obs.scene" })
export class OBSSceneSwitch extends SingletonAction<SceneSettings> {
	private actionInstances: Map<string, Action<SceneSettings>> = new Map();
	private currentScene: string = "";
	private isConnecting = false;
	private eventBound = false;

	override async onWillAppear(ev: WillAppearEvent<SceneSettings>): Promise<void> {
		// Track this action instance
		this.actionInstances.set(ev.action.id, ev.action);

		// Set password if provided
		if (ev.payload.settings.obsPassword) {
			obsClient.setPassword(ev.payload.settings.obsPassword);
		}

		// Connect to OBS and bind events
		await this.ensureConnected();

		// Update button with current state
		await this.updateButtonState(ev.action, ev.payload.settings);
	}

	override onWillDisappear(ev: WillDisappearEvent<SceneSettings>): void | Promise<void> {
		this.actionInstances.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SceneSettings>): Promise<void> {
		if (ev.payload.settings.obsPassword) {
			obsClient.setPassword(ev.payload.settings.obsPassword);
		}
		await this.updateButtonState(ev.action, ev.payload.settings);
	}

	override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent<SceneSettings>): Promise<void> {
		console.log("[Scene Switch] Property Inspector appeared");
		await this.sendScenesListToPI();
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, SceneSettings>): Promise<void> {
		const payload = ev.payload as { event?: string };

		if (payload.event === "refreshScenes") {
			await this.sendScenesListToPI();
		}
	}

	override async onKeyDown(ev: KeyDownEvent<SceneSettings>): Promise<void> {
		const { sceneName } = ev.payload.settings;

		if (!sceneName) {
			await ev.action.showAlert();
			return;
		}

		try {
			await this.ensureConnected();

			// Switch to scene
			await obsClient.sendRequest({
				requestType: "SetCurrentProgramScene",
				requestData: { sceneName }
			});

			await ev.action.showOk();
		} catch (error) {
			console.error("[Scene Switch] Failed:", error);
			await ev.action.showAlert();
		}
	}

	private async ensureConnected(): Promise<void> {
		if (obsClient.isConnected()) {
			if (!this.eventBound) {
				this.bindEvents();
			}
			return;
		}

		if (this.isConnecting) return;
		this.isConnecting = true;

		try {
			await obsClient.connect();
			this.bindEvents();

			// Get current scene
			const status = await obsClient.sendRequest({ requestType: "GetCurrentProgramScene" });
			if (status.responseData) {
				this.currentScene = status.responseData.currentProgramSceneName as string;
			}

			this.updateAllButtons();
		} catch (error) {
			console.error("[Scene Switch] Connection failed:", error);
		} finally {
			this.isConnecting = false;
		}
	}

	private bindEvents(): void {
		if (this.eventBound) return;

		// Listen for scene changes
		obsClient.on("CurrentProgramSceneChanged", (data) => {
			this.currentScene = data.sceneName as string;
			this.updateAllButtons();
		});

		this.eventBound = true;
	}

	private async sendScenesListToPI(): Promise<void> {
		try {
			await this.ensureConnected();

			const response = await obsClient.sendRequest({ requestType: "GetSceneList" });
			const scenes = (response.responseData?.scenes as Array<{ sceneName: string }>) || [];

			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "scenesList",
				scenes: scenes.map(s => s.sceneName).reverse() // OBS returns in reverse order
			});
		} catch (error) {
			console.error("[Scene Switch] Failed to get scenes:", error);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "apiError",
				message: `OBS connection error: ${(error as Error).message}`
			});
		}
	}

	private updateAllButtons(): void {
		this.actionInstances.forEach((actionInstance, actionId) => {
			// Get settings from the action instance
			void actionInstance.getSettings().then(settings => {
				void this.updateButtonState(actionInstance, settings);
			});
		});
	}

	private async updateButtonState(actionInstance: Action<SceneSettings>, settings: SceneSettings): Promise<void> {
		if (!actionInstance.isKey()) return;

		const { sceneName } = settings;

		if (!sceneName) {
			await actionInstance.setTitle("Scene");
			await actionInstance.setState(0);
			return;
		}

		// Show scene name on button
		await actionInstance.setTitle(sceneName);

		// Set state based on whether this is the current scene
		const isActive = this.currentScene === sceneName;
		await actionInstance.setState(isActive ? 1 : 0);
	}
}
