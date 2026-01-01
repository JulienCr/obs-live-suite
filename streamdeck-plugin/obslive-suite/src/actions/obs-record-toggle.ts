/**
 * Toggle Recording Action
 * Start/stop OBS recording with real-time state display
 */

import { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, Action, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { obsClient } from "../utils/obs-websocket-client";

type RecordSettings = {
	obsPassword?: string;
	[key: string]: string | undefined;
};

interface RecordingState {
	isRecording: boolean;
	isPaused: boolean;
}

@action({ UUID: "com.julien-cruau.obslive-suite.obs.record" })
export class OBSRecordToggle extends SingletonAction<RecordSettings> {
	private actionInstances: Map<string, Action<RecordSettings>> = new Map();
	private recordingState: RecordingState = { isRecording: false, isPaused: false };
	private isConnecting = false;
	private eventBound = false;

	override async onWillAppear(ev: WillAppearEvent<RecordSettings>): Promise<void> {
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

	override onWillDisappear(ev: WillDisappearEvent<RecordSettings>): void | Promise<void> {
		this.actionInstances.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<RecordSettings>): Promise<void> {
		if (ev.payload.settings.obsPassword) {
			obsClient.setPassword(ev.payload.settings.obsPassword);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<RecordSettings>): Promise<void> {
		try {
			await this.ensureConnected();

			// Toggle recording
			await obsClient.sendRequest({ requestType: "ToggleRecord" });

			// State will be updated via event listener
			await ev.action.showOk();
		} catch (error) {
			console.error("[Record Toggle] Failed:", error);
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

			// Get initial recording status
			const status = await obsClient.sendRequest({ requestType: "GetRecordStatus" });
			if (status.responseData) {
				this.recordingState.isRecording = status.responseData.outputActive as boolean;
				this.recordingState.isPaused = status.responseData.outputPaused as boolean;
			}

			this.updateAllButtons();
		} catch (error) {
			console.error("[Record Toggle] Connection failed:", error);
		} finally {
			this.isConnecting = false;
		}
	}

	private bindEvents(): void {
		if (this.eventBound) return;

		// Listen for recording state changes
		obsClient.on("RecordStateChanged", (data) => {
			const outputState = data.outputState as string;

			switch (outputState) {
				case "OBS_WEBSOCKET_OUTPUT_STARTED":
					this.recordingState.isRecording = true;
					this.recordingState.isPaused = false;
					break;
				case "OBS_WEBSOCKET_OUTPUT_STOPPED":
					this.recordingState.isRecording = false;
					this.recordingState.isPaused = false;
					break;
				case "OBS_WEBSOCKET_OUTPUT_PAUSED":
					this.recordingState.isPaused = true;
					break;
				case "OBS_WEBSOCKET_OUTPUT_RESUMED":
					this.recordingState.isPaused = false;
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

	private async updateButtonState(actionInstance: Action<RecordSettings>): Promise<void> {
		if (!actionInstance.isKey()) return;

		const { isRecording, isPaused } = this.recordingState;

		if (isRecording) {
			if (isPaused) {
				await actionInstance.setTitle("REC\nPAUSED");
			} else {
				await actionInstance.setTitle("REC");
			}
			await actionInstance.setState(1); // Recording state (red)
		} else {
			await actionInstance.setTitle("REC\nOFF");
			await actionInstance.setState(0); // Idle state
		}
	}
}
