/**
 * Hide Lower Third Action
 * Hides the currently displayed lower third
 */

import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";

@action({ UUID: "com.julien-cruau.obslive-suite.lower.hide" })
export class LowerThirdHide extends SingletonAction {
	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		try {
			await APIClient.hideLowerThird();
			await ev.action.showOk();
		} catch (error) {
			console.error("[Lower Hide] Failed:", error);
			await ev.action.showAlert();
		}
	}
}

