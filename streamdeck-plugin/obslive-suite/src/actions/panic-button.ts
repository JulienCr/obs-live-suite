/**
 * Panic Button Action
 * Clears all overlays immediately
 */

import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";

@action({ UUID: "com.julien-cruau.obslive-suite.panic" })
export class PanicButton extends SingletonAction {
	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		try {
			await APIClient.triggerPanic();
			await ev.action.showOk();
		} catch (error) {
			console.error("[Panic] Failed:", error);
			await ev.action.showAlert();
		}
	}
}
