/**
 * Add Time to Countdown Action
 * Adds seconds to a running countdown
 */

import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";

@action({ UUID: "com.julien-cruau.obslive-suite.countdown.addtime" })
export class CountdownAddTime extends SingletonAction<AddTimeSettings> {
	override async onKeyDown(ev: KeyDownEvent<AddTimeSettings>): Promise<void> {
		const { seconds = 30 } = ev.payload.settings;

		try {
			await APIClient.addCountdownTime(seconds);
			await ev.action.showOk();
		} catch (error) {
			console.error("[Countdown Add Time] Failed:", error);
			await ev.action.showAlert();
		}
	}
}

type AddTimeSettings = {
	seconds?: number;
};

