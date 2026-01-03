/**
 * Toggle Streaming Action
 * Start/stop OBS streaming with real-time state display
 */

import { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, Action, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { obsClient } from "../utils/obs-websocket-client";

type StreamSettings = {
	obsPassword?: string;
	[key: string]: string | undefined;
};

interface StreamingState {
	isStreaming: boolean;
}

@action({ UUID: "com.julien-cruau.obslive-suite.obs.stream" })
export class OBSStreamToggle extends SingletonAction<StreamSettings> {
	private actionInstances: Map<string, Action<StreamSettings>> = new Map();
	private streamingState: StreamingState = { isStreaming: false };
	private isConnecting = false;
	private eventBound = false;

	override async onWillAppear(ev: WillAppearEvent<StreamSettings>): Promise<void> {
		// Track this action instance
		this.actionInstances.set(ev.action.id, ev.action);

		// Set password if provided
		if (ev.payload.settings.obsPassword) {
			obsClient.setPassword(ev.payload.settings.obsPassword);
		}

		// Connect to OBS and bind events
		await this.ensureConnected();

		// Update button with current state
		await this.updateButtonState(ev.action);
	}

	override onWillDisappear(ev: WillDisappearEvent<StreamSettings>): void | Promise<void> {
		this.actionInstances.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<StreamSettings>): Promise<void> {
		if (ev.payload.settings.obsPassword) {
			obsClient.setPassword(ev.payload.settings.obsPassword);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<StreamSettings>): Promise<void> {
		try {
			await this.ensureConnected();

			// Toggle streaming
			await obsClient.sendRequest({ requestType: "ToggleStream" });

			// State will be updated via event listener
			await ev.action.showOk();
		} catch (error) {
			console.error("[Stream Toggle] Failed:", error);
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

			// Get initial streaming status
			const status = await obsClient.sendRequest({ requestType: "GetStreamStatus" });
			if (status.responseData) {
				this.streamingState.isStreaming = status.responseData.outputActive as boolean;
			}

			this.updateAllButtons();
		} catch (error) {
			console.error("[Stream Toggle] Connection failed:", error);
		} finally {
			this.isConnecting = false;
		}
	}

	private bindEvents(): void {
		if (this.eventBound) return;

		// Listen for streaming state changes
		obsClient.on("StreamStateChanged", (data) => {
			const outputState = data.outputState as string;

			switch (outputState) {
				case "OBS_WEBSOCKET_OUTPUT_STARTED":
					this.streamingState.isStreaming = true;
					break;
				case "OBS_WEBSOCKET_OUTPUT_STOPPED":
					this.streamingState.isStreaming = false;
					break;
			}

			this.updateAllButtons();
		});

		this.eventBound = true;
	}

	private updateAllButtons(): void {
		this.actionInstances.forEach((actionInstance) => {
			void this.updateButtonState(actionInstance);
		});
	}

	private async updateButtonState(actionInstance: Action<StreamSettings>): Promise<void> {
		if (!actionInstance.isKey()) return;

		const { isStreaming } = this.streamingState;

		if (isStreaming) {
			await actionInstance.setTitle("LIVE");
			await actionInstance.setState(1); // Streaming state (red)
		} else {
			await actionInstance.setTitle("STREAM\nOFF");
			await actionInstance.setState(0); // Idle state
		}
	}
}
