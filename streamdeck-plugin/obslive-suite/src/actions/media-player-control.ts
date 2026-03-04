/**
 * Media Player Control Action
 * Sends transport commands (play, pause, stop, next, prev, replay, fadeout)
 * to a configured media player driver.
 */

import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";

type MediaPlayerSettings = {
	driverId?: string;
	action?: string;
};

@action({ UUID: "com.julien-cruau.obslive-suite.media-player" })
export class MediaPlayerControl extends SingletonAction<MediaPlayerSettings> {
	override async onKeyDown(ev: KeyDownEvent<MediaPlayerSettings>): Promise<void> {
		const { driverId = "artlist", action: playerAction = "play" } = ev.payload.settings;

		try {
			await APIClient.mediaPlayerCommand(driverId, playerAction);
			await ev.action.showOk();
		} catch (error) {
			console.error("[MediaPlayer] Failed:", error);
			await ev.action.showAlert();
		}
	}
}
