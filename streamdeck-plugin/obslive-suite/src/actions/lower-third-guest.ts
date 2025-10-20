/**
 * Show Guest Lower Third Action
 * Displays a pre-configured guest from the database
 */

import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, SendToPluginEvent, JsonValue, PropertyInspectorDidAppearEvent } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";

@action({ UUID: "com.julien-cruau.obslive-suite.lower.guest" })
export class LowerThirdGuest extends SingletonAction<GuestSettings> {
	override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent<GuestSettings>): Promise<void> {
		console.log("[Lower Guest] Property Inspector appeared");
		// Send guest list to property inspector when it appears
		await this.sendGuestsListToPI(ev);
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, GuestSettings>): Promise<void> {
		console.log("[Lower Guest] Received sendToPlugin:", ev.payload);
		const payload = ev.payload as { event?: string };

		if (payload.event === "refreshGuests") {
			console.log("[Lower Guest] Refreshing guests list");
			await this.sendGuestsListToPI(ev);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<GuestSettings>): Promise<void> {
		const { guestId, side = "left", duration = 8 } = ev.payload.settings;

		if (!guestId) {
			await ev.action.showAlert();
			return;
		}

		try {
			await APIClient.showGuestLowerThird(guestId, side, duration);
			await ev.action.showOk();
		} catch (error) {
			console.error("[Lower Guest] Failed:", error);
			await ev.action.showAlert();
		}
	}

	private async sendGuestsListToPI(ev: SendToPluginEvent<JsonValue, GuestSettings> | PropertyInspectorDidAppearEvent<GuestSettings>): Promise<void> {
		try {
			console.log("[Lower Guest] Fetching guests from API...");
			const guests = await APIClient.getGuests();
			console.log("[Lower Guest] Fetched guests:", guests.length);

			if (guests.length === 0) {
				console.log("[Lower Guest] No guests found, sending error");
				await streamDeck.ui.current?.sendToPropertyInspector({
					event: "apiError",
					message: "No guests found",
				});
			} else {
				console.log("[Lower Guest] Sending guests list to PI");
				await streamDeck.ui.current?.sendToPropertyInspector({
					event: "guestsList",
					guests: guests,
				});
			}
		} catch (error) {
			console.error("[Lower Guest] API Error:", error);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "apiError",
				message: `API error: ${(error as Error).message}`,
			});
		}
	}
}

type GuestSettings = {
	guestId?: string;
	side?: string;
	duration?: number;
};

