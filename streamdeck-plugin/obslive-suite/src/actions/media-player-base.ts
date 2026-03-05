/**
 * Base class for Media Player Stream Deck actions.
 * Handles WebSocket state tracking, driver color theming,
 * and instance management for all media player buttons.
 */

import { Action, DidReceiveSettingsEvent, KeyAction, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";
import { wsManager, MediaPlayerState } from "../utils/websocket-manager";
import { getDriverColors } from "../utils/media-player-icons";

export type MediaPlayerActionSettings = {
	driverId?: string;
};

const DEFAULT_STATE: (driverId: string) => MediaPlayerState = (driverId) => ({
	driverId,
	connected: false,
	playing: false,
	track: "",
	artist: "",
});

export abstract class MediaPlayerBase extends SingletonAction<MediaPlayerActionSettings> {
	private instances: Map<string, Action<MediaPlayerActionSettings>> = new Map();
	private instanceSettings: Map<string, MediaPlayerActionSettings> = new Map();

	constructor() {
		super();
		wsManager.onMediaPlayerUpdate((driverId: string, state: MediaPlayerState) => {
			this.instances.forEach((actionInstance, id) => {
				const settings = this.instanceSettings.get(id);
				const instanceDriver = settings?.driverId || "artlist";
				if (instanceDriver === driverId && actionInstance.isKey()) {
					void this.updateButton(actionInstance, driverId, state);
				}
			});
		});
	}

	override async onWillAppear(ev: WillAppearEvent<MediaPlayerActionSettings>): Promise<void> {
		this.instances.set(ev.action.id, ev.action);
		this.instanceSettings.set(ev.action.id, ev.payload.settings);

		if (!ev.action.isKey()) return;

		const driverId = ev.payload.settings.driverId || "artlist";
		const state = wsManager.getMediaPlayerState(driverId) || DEFAULT_STATE(driverId);
		await this.updateButton(ev.action, driverId, state);
	}

	override onWillDisappear(ev: WillDisappearEvent<MediaPlayerActionSettings>): void {
		this.instances.delete(ev.action.id);
		this.instanceSettings.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MediaPlayerActionSettings>): Promise<void> {
		this.instanceSettings.set(ev.action.id, ev.payload.settings);

		const driverId = ev.payload.settings.driverId || "artlist";
		const state = wsManager.getMediaPlayerState(driverId) || DEFAULT_STATE(driverId);
		const action = this.instances.get(ev.action.id);
		if (action && action.isKey()) {
			await this.updateButton(action, driverId, state);
		}
	}

	protected async sendCommand(driverId: string, command: string): Promise<void> {
		await APIClient.mediaPlayerCommand(driverId, command);
	}

	protected getColors(driverId: string) {
		return getDriverColors(driverId);
	}

	protected abstract updateButton(
		action: KeyAction<MediaPlayerActionSettings>,
		driverId: string,
		state: MediaPlayerState,
	): Promise<void>;
}
