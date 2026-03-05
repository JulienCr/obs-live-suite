/**
 * Media Player Previous Track Action
 */

import { action, KeyAction, KeyDownEvent } from "@elgato/streamdeck";
import { MediaPlayerBase, MediaPlayerActionSettings } from "./media-player-base";
import { MediaPlayerState } from "../utils/websocket-manager";
import { generatePrevIcon } from "../utils/media-player-icons";

@action({ UUID: "com.julien-cruau.obslive-suite.media-player.prev" })
export class MediaPlayerPrev extends MediaPlayerBase {
	override async onKeyDown(ev: KeyDownEvent<MediaPlayerActionSettings>): Promise<void> {
		const driverId = ev.payload.settings.driverId || "artlist";
		try {
			await this.sendCommand(driverId, "prev");
			await ev.action.showOk();
		} catch (error) {
			console.error("[MediaPlayer Prev] Failed:", error);
			await ev.action.showAlert();
		}
	}

	protected override async updateButton(
		actionInstance: KeyAction<MediaPlayerActionSettings>,
		driverId: string,
		_state: MediaPlayerState,
	): Promise<void> {
		const { bg, accent } = this.getColors(driverId);
		await actionInstance.setImage(generatePrevIcon(bg, accent));
	}
}
