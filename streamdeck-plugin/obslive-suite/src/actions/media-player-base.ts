/**
 * Base class for Media Player Stream Deck actions.
 * Handles WebSocket state tracking, driver color theming,
 * and instance management for all media player buttons.
 *
 * Simple transport actions (next, prev, stop, fadeout) only need to set
 * `command` and `iconGenerator` — the base class handles everything else.
 * Actions needing custom behavior (play-pause) override onKeyDown/updateButton.
 */

import { Action, DidReceiveSettingsEvent, KeyAction, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";
import { wsManager, MediaPlayerState } from "../utils/websocket-manager";
import { getDriverColors, IconGenerator } from "../utils/media-player-icons";

export type MediaPlayerActionSettings = {
	driverId?: string;
};

export const DEFAULT_DRIVER_ID = "artlist";

export function resolveDriverId(settings: MediaPlayerActionSettings): string {
	return settings.driverId || DEFAULT_DRIVER_ID;
}

const DEFAULT_STATE = (driverId: string): MediaPlayerState => ({
	driverId,
	connected: false,
	playing: false,
	track: "",
	artist: "",
});

export abstract class MediaPlayerBase extends SingletonAction<MediaPlayerActionSettings> {
	private instances: Map<string, Action<MediaPlayerActionSettings>> = new Map();
	private instanceSettings: Map<string, MediaPlayerActionSettings> = new Map();

	protected readonly command?: string;
	protected readonly iconGenerator?: IconGenerator;

	constructor() {
		super();
		wsManager.onMediaPlayerUpdate((driverId: string, state: MediaPlayerState) => {
			this.instances.forEach((actionInstance, id) => {
				const settings = this.instanceSettings.get(id);
				const instanceDriver = resolveDriverId(settings || {});
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

		const driverId = resolveDriverId(ev.payload.settings);
		const state = wsManager.getMediaPlayerState(driverId) || DEFAULT_STATE(driverId);
		await this.updateButton(ev.action, driverId, state);
	}

	override onWillDisappear(ev: WillDisappearEvent<MediaPlayerActionSettings>): void {
		this.instances.delete(ev.action.id);
		this.instanceSettings.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MediaPlayerActionSettings>): Promise<void> {
		this.instanceSettings.set(ev.action.id, ev.payload.settings);

		const driverId = resolveDriverId(ev.payload.settings);
		const state = wsManager.getMediaPlayerState(driverId) || DEFAULT_STATE(driverId);
		const action = this.instances.get(ev.action.id);
		if (action && action.isKey()) {
			await this.updateButton(action, driverId, state);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<MediaPlayerActionSettings>): Promise<void> {
		if (!this.command) return;
		const driverId = resolveDriverId(ev.payload.settings);
		try {
			await this.sendCommand(driverId, this.command);
			await ev.action.showOk();
		} catch {
			await ev.action.showAlert();
		}
	}

	protected async sendCommand(driverId: string, command: string): Promise<void> {
		await APIClient.mediaPlayerCommand(driverId, command);
	}

	protected async updateButton(
		action: KeyAction<MediaPlayerActionSettings>,
		driverId: string,
		_state: MediaPlayerState,
	): Promise<void> {
		if (!this.iconGenerator) return;
		const { bg, accent } = getDriverColors(driverId);
		await action.setImage(this.iconGenerator(bg, accent));
	}
}
