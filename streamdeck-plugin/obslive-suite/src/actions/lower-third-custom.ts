/**
 * Custom Lower Third Action
 * Displays a custom lower third with text
 */

import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";

@action({ UUID: "com.julien-cruau.obslive-suite.lower.custom" })
export class LowerThirdCustom extends SingletonAction<CustomSettings> {
	override onWillAppear(ev: WillAppearEvent<CustomSettings>): void | Promise<void> {
		// Action appears, no special initialization needed
	}

	override async onKeyDown(ev: KeyDownEvent<CustomSettings>): Promise<void> {
		const { title, subtitle = "", side = "left", duration = 8 } = ev.payload.settings;

		if (!title) {
			await ev.action.showAlert();
			return;
		}

		try {
			await APIClient.showCustomLowerThird(title, subtitle, side, duration);
			await ev.action.showOk();
		} catch (error) {
			console.error("[Lower Custom] Failed:", error);
			await ev.action.showAlert();
		}
	}
}

type CustomSettings = {
	title?: string;
	subtitle?: string;
	side?: string;
	duration?: number;
};

