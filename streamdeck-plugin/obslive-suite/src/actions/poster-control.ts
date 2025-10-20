/**
 * Control Poster Action
 * Hide, next, or previous poster
 */

import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";

@action({ UUID: "com.julien-cruau.obslive-suite.poster.control" })
export class PosterControl extends SingletonAction<PosterControlSettings> {
	override async onKeyDown(ev: KeyDownEvent<PosterControlSettings>): Promise<void> {
		const { action: posterAction = "hide" } = ev.payload.settings;

		try {
			await APIClient.controlPoster(posterAction);
			await ev.action.showOk();
		} catch (error) {
			console.error("[Poster Control] Failed:", error);
			await ev.action.showAlert();
		}
	}
}

type PosterControlSettings = {
	action?: string;
};

