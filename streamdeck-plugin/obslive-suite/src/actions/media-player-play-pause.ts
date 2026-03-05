/**
 * Media Player Play/Pause Action
 * Toggles play/pause and shows track info on the button.
 */

import { action, KeyAction, KeyDownEvent, streamDeck } from "@elgato/streamdeck";
import { MediaPlayerBase, MediaPlayerActionSettings, MediaPlayerCommand, resolveDriverId } from "./media-player-base";
import { wsManager, MediaPlayerState } from "../utils/websocket-manager";
import { generatePlayIcon, generatePauseIcon, getDriverColors } from "../utils/media-player-icons";
import { truncate } from "../utils/title-helper";

@action({ UUID: "com.julien-cruau.obslive-suite.media-player.play-pause" })
export class MediaPlayerPlayPause extends MediaPlayerBase {
	override async onKeyDown(ev: KeyDownEvent<MediaPlayerActionSettings>): Promise<void> {
		const driverId = resolveDriverId(ev.payload.settings);
		const state = wsManager.getMediaPlayerState(driverId);
		const command: MediaPlayerCommand = state?.playing ? "pause" : "play";

		try {
			await this.sendCommand(driverId, command);
		} catch (error) {
			streamDeck.logger.error(`[MediaPlayer] ${command} failed:`, error);
			await ev.action.showAlert();
		}
	}

	protected override async updateButton(
		actionInstance: KeyAction<MediaPlayerActionSettings>,
		driverId: string,
		state: MediaPlayerState,
	): Promise<void> {
		const { bg, accent } = getDriverColors(driverId);

		if (state.playing) {
			await actionInstance.setImage(generatePauseIcon(bg, accent));
		} else {
			await actionInstance.setImage(generatePlayIcon(bg, accent));
		}

		if (state.artist || state.track) {
			const artist = truncate(state.artist, 10);
			const track = truncate(state.track, 10);
			const title = [artist, track].filter(Boolean).join("\n");
			await actionInstance.setTitle(title);
		} else {
			await actionInstance.setTitle("");
		}
	}
}
