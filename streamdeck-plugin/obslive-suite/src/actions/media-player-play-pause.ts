/**
 * Media Player Play/Pause Action
 * Toggles play/pause and shows track info on the button.
 */

import { action, KeyAction, KeyDownEvent } from "@elgato/streamdeck";
import { MediaPlayerBase, MediaPlayerActionSettings } from "./media-player-base";
import { wsManager, MediaPlayerState } from "../utils/websocket-manager";
import { generatePlayIcon, generatePauseIcon } from "../utils/media-player-icons";

@action({ UUID: "com.julien-cruau.obslive-suite.media-player.play-pause" })
export class MediaPlayerPlayPause extends MediaPlayerBase {
	override async onKeyDown(ev: KeyDownEvent<MediaPlayerActionSettings>): Promise<void> {
		const driverId = ev.payload.settings.driverId || "artlist";
		const state = wsManager.getMediaPlayerState(driverId);
		const command = state?.playing ? "pause" : "play";

		try {
			await this.sendCommand(driverId, command);
		} catch (error) {
			console.error("[MediaPlayer PlayPause] Failed:", error);
			await ev.action.showAlert();
		}
	}

	protected override async updateButton(
		actionInstance: KeyAction<MediaPlayerActionSettings>,
		driverId: string,
		state: MediaPlayerState,
	): Promise<void> {
		const { bg, accent } = this.getColors(driverId);

		if (state.playing) {
			await actionInstance.setImage(generatePauseIcon(bg, accent));
		} else {
			await actionInstance.setImage(generatePlayIcon(bg, accent));
		}

		// Show track info
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

function truncate(text: string, maxLen: number): string {
	if (!text) return "";
	return text.length > maxLen ? text.slice(0, maxLen - 1) + "\u2026" : text;
}
