/**
 * Show Guest Lower Third Action
 * Displays a pre-configured guest from the database
 */

import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, SendToPluginEvent, JsonValue, PropertyInspectorDidAppearEvent, Action, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { APIClient, Guest } from "../utils/api-client";
import { getGuestAvatar } from "../utils/image-helper";

@action({ UUID: "com.julien-cruau.obslive-suite.lower.guest" })
export class LowerThirdGuest extends SingletonAction<GuestSettings> {
	private actionInstances: Map<string, Action<GuestSettings>> = new Map();
	private guestsCache: Guest[] = [];
	override async onWillAppear(ev: WillAppearEvent<GuestSettings>): Promise<void> {
		// Track this action instance
		this.actionInstances.set(ev.action.id, ev.action);

		// Update button image with current guest selection
		await this.updateButtonImage(ev.action, ev.payload.settings);
	}

	override onWillDisappear(ev: WillDisappearEvent<GuestSettings>): void | Promise<void> {
		// Remove this action instance
		this.actionInstances.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<GuestSettings>): Promise<void> {
		// Update button image when settings change
		await this.updateButtonImage(ev.action, ev.payload.settings);
	}

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

			// Cache guests for button image updates
			this.guestsCache = guests;

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

	/**
	 * Update button image with guest avatar
	 */
	private async updateButtonImage(actionInstance: Action<GuestSettings>, settings: GuestSettings): Promise<void> {
		const { guestId } = settings;

		if (!guestId) {
			// No guest selected, clear image to default
			if (actionInstance.isKey()) {
				await actionInstance.setImage(undefined);
			}
			return;
		}

		try {
			// Find guest in cache or fetch
			let guest = this.guestsCache.find((g) => g.id === guestId);
			
			if (!guest) {
				// Not in cache, fetch fresh list
				const guests = await APIClient.getGuests();
				this.guestsCache = guests;
				guest = guests.find((g) => g.id === guestId);
			}

			if (!guest) {
				console.warn(`[Lower Guest] Guest not found: ${guestId}`);
				return;
			}

			// Fetch and set avatar image
			console.log(`[Lower Guest] Fetching avatar for ${guest.displayName}...`);
			const avatarDataUri = await getGuestAvatar(guest.avatarUrl, guest.displayName);
			
			if (actionInstance.isKey()) {
				await actionInstance.setImage(avatarDataUri);
				console.log(`[Lower Guest] Avatar set for ${guest.displayName}`);
			}
		} catch (error) {
			console.error("[Lower Guest] Failed to update button image:", error);
		}
	}
}

type GuestSettings = {
	guestId?: string;
	side?: string;
	duration?: number;
};

