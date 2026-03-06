/**
 * Base class for Media Player Stream Deck actions.
 * Handles WebSocket state tracking, driver color theming,
 * and instance management for all media player buttons.
 *
 * Simple transport actions (next, prev, stop, fadeout) only need to set
 * `command` and `iconGenerator` — the base class handles everything else.
 * Actions needing custom behavior (play-pause) override onKeyDown/updateButton.
 */

import { Action, DidReceiveSettingsEvent, KeyAction, KeyDownEvent, SingletonAction, streamDeck, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";
import { wsManager, MediaPlayerState } from "../utils/websocket-manager";
import { getDriverColors, IconGenerator } from "../utils/media-player-icons";

export type MediaPlayerCommand = "play" | "pause" | "stop" | "next" | "prev" | "replay" | "fadeout";

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
	artworkUrl: "",
});

type TrackedInstance = {
	action: Action<MediaPlayerActionSettings>;
	settings: MediaPlayerActionSettings;
};

export abstract class MediaPlayerBase extends SingletonAction<MediaPlayerActionSettings> {
	private instances: Map<string, TrackedInstance> = new Map();

	protected readonly command?: MediaPlayerCommand;
	protected readonly iconGenerator?: IconGenerator;
	/** Override to true in subclasses that need live state updates (e.g. play-pause). */
	protected readonly tracksState: boolean = false;

	constructor() {
		super();
		wsManager.onMediaPlayerUpdate((driverId: string, state: MediaPlayerState) => {
			if (!this.tracksState && this.iconGenerator) return;
			this.instances.forEach(({ action: actionInstance, settings }) => {
				const instanceDriver = resolveDriverId(settings);
				if (instanceDriver === driverId && actionInstance.isKey()) {
					void this.updateButton(actionInstance, driverId, state);
				}
			});
		});
	}

	override async onWillAppear(ev: WillAppearEvent<MediaPlayerActionSettings>): Promise<void> {
		this.instances.set(ev.action.id, { action: ev.action, settings: ev.payload.settings });

		if (!ev.action.isKey()) return;

		const driverId = resolveDriverId(ev.payload.settings);
		const state = wsManager.getMediaPlayerState(driverId) || DEFAULT_STATE(driverId);
		await this.updateButton(ev.action, driverId, state);
	}

	override onWillDisappear(ev: WillDisappearEvent<MediaPlayerActionSettings>): void {
		this.instances.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MediaPlayerActionSettings>): Promise<void> {
		const existing = this.instances.get(ev.action.id);
		if (existing) existing.settings = ev.payload.settings;

		const driverId = resolveDriverId(ev.payload.settings);
		const state = wsManager.getMediaPlayerState(driverId) || DEFAULT_STATE(driverId);
		const action = existing?.action;
		if (action && action.isKey()) {
			await this.updateButton(action, driverId, state);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<MediaPlayerActionSettings>): Promise<void> {
		if (!this.command) return;
		const driverId = resolveDriverId(ev.payload.settings);
		try {
			await this.sendCommand(driverId, this.command);
		} catch (error) {
			streamDeck.logger.error(`[MediaPlayer] ${this.command} failed:`, error);
			await ev.action.showAlert();
		}
	}

	protected async sendCommand(driverId: string, command: MediaPlayerCommand): Promise<void> {
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
