/**
 * Media Player Next Track Action
 */

import { action, KeyAction, KeyDownEvent } from "@elgato/streamdeck";
import { MediaPlayerBase, MediaPlayerActionSettings } from "./media-player-base";
import { MediaPlayerState } from "../utils/websocket-manager";
import { generateNextIcon } from "../utils/media-player-icons";

@action({ UUID: "com.julien-cruau.obslive-suite.media-player.next" })
export class MediaPlayerNext extends MediaPlayerBase {
	override async onKeyDown(ev: KeyDownEvent<MediaPlayerActionSettings>): Promise<void> {
		const driverId = ev.payload.settings.driverId || "artlist";
		try {
			await this.sendCommand(driverId, "next");
			await ev.action.showOk();
		} catch (error) {
			console.error("[MediaPlayer Next] Failed:", error);
			await ev.action.showAlert();
		}
	}

	protected override async updateButton(
		actionInstance: KeyAction<MediaPlayerActionSettings>,
		driverId: string,
		_state: MediaPlayerState,
	): Promise<void> {
		const { bg, accent } = this.getColors(driverId);
		await actionInstance.setImage(generateNextIcon(bg, accent));
	}
}
