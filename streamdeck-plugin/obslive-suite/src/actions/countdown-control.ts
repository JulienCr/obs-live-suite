/**
 * Control Countdown Action
 * Pause, resume, or reset the countdown
 */

import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";

@action({ UUID: "com.julien-cruau.obslive-suite.countdown.control" })
export class CountdownControl extends SingletonAction<ControlSettings> {
	override async onKeyDown(ev: KeyDownEvent<ControlSettings>): Promise<void> {
		const { action: countdownAction = "pause" } = ev.payload.settings;

		try {
			await APIClient.controlCountdown(countdownAction);
			await ev.action.showOk();
		} catch (error) {
			console.error("[Countdown Control] Failed:", error);
			await ev.action.showAlert();
		}
	}
}

type ControlSettings = {
	action?: string;
};

