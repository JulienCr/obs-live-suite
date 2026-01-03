/**
 * Guest Slot Action
 * Auto-populated guest button based on slot number
 * User selects which slot (1-30) this button represents
 */

import streamDeck, {
	action,
	SingletonAction,
	WillAppearEvent,
	WillDisappearEvent,
	KeyDownEvent,
	SendToPluginEvent,
	PropertyInspectorDidAppearEvent,
	DidReceiveSettingsEvent,
	JsonValue,
	Action
} from "@elgato/streamdeck";
import { APIClient, Guest } from "../utils/api-client";
import { getGuestAvatar, generateGrayedGuestIcon } from "../utils/image-helper";
import { wrapTitle } from "../utils/title-helper";

type GuestSlotSettings = {
	slotNumber?: number;
};

@action({ UUID: "com.julien-cruau.obslive-suite.lower.guest.slot" })
export class GuestSlot extends SingletonAction<GuestSlotSettings> {
	private actionInstances: Map<string, Action<GuestSlotSettings>> = new Map();
	private guestsCache: Guest[] = [];
	private refreshInterval: ReturnType<typeof setInterval> | null = null;

	override async onWillAppear(ev: WillAppearEvent<GuestSlotSettings>): Promise<void> {
		this.actionInstances.set(ev.action.id, ev.action);

		// Start polling if first instance
		if (this.actionInstances.size === 1) {
			this.startPolling();
		}

		// Update this button
		await this.updateButtonDisplay(ev.action, ev.payload.settings);
	}

	override onWillDisappear(ev: WillDisappearEvent<GuestSlotSettings>): void {
		this.actionInstances.delete(ev.action.id);

		// Stop polling if no more instances
		if (this.actionInstances.size === 0) {
			this.stopPolling();
		}
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<GuestSlotSettings>): Promise<void> {
		await this.updateButtonDisplay(ev.action, ev.payload.settings);
	}

	override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent<GuestSlotSettings>): Promise<void> {
		// Send slot options and current guest info to PI
		const settings = await ev.action.getSettings();
		await this.sendSlotInfoToPI(settings);
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, GuestSlotSettings>): Promise<void> {
		const payload = ev.payload as { event?: string };

		if (payload.event === "refresh") {
			streamDeck.logger.info("[GuestSlot] Manual refresh triggered");
			await this.refreshGuests();
			await this.sendSlotInfoToPI(ev.action.getSettings() as unknown as GuestSlotSettings);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<GuestSlotSettings>): Promise<void> {
		const { slotNumber } = ev.payload.settings;

		if (!slotNumber) {
			await ev.action.showAlert();
			return;
		}

		const guest = this.guestsCache[slotNumber - 1];

		if (!guest) {
			// Empty slot
			await ev.action.showAlert();
			return;
		}

		try {
			await APIClient.showGuestLowerThird(guest.id, "left", 8);
			await ev.action.showOk();
			streamDeck.logger.info(`[GuestSlot] Showed guest: ${guest.displayName}`);
		} catch (error) {
			streamDeck.logger.error("[GuestSlot] Failed:", error);
			await ev.action.showAlert();
		}
	}

	private startPolling(): void {
		if (this.refreshInterval) return;

		streamDeck.logger.info("[GuestSlot] Starting polling (30s interval)");
		this.refreshGuests();

		this.refreshInterval = setInterval(() => {
			this.refreshGuests();
		}, 30000);
	}

	private stopPolling(): void {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = null;
			streamDeck.logger.info("[GuestSlot] Stopped polling");
		}
	}

	private async refreshGuests(): Promise<void> {
		try {
			this.guestsCache = await APIClient.getGuests();
			streamDeck.logger.info(`[GuestSlot] Refreshed: ${this.guestsCache.length} guests`);

			// Update all button instances
			for (const [, actionInstance] of this.actionInstances) {
				const settings = await actionInstance.getSettings();
				await this.updateButtonDisplay(actionInstance, settings);
			}
		} catch (error) {
			streamDeck.logger.error("[GuestSlot] Failed to refresh guests:", error);
		}
	}

	private async sendSlotInfoToPI(settings: GuestSlotSettings): Promise<void> {
		const slotNumber = settings.slotNumber || 0;
		const guest = slotNumber > 0 ? this.guestsCache[slotNumber - 1] : null;

		await streamDeck.ui.current?.sendToPropertyInspector({
			event: "slotInfo",
			slotNumber: slotNumber,
			guest: guest,
			totalGuests: this.guestsCache.length,
		});
	}

	private async updateButtonDisplay(actionInstance: Action<GuestSlotSettings>, settings: GuestSlotSettings): Promise<void> {
		const { slotNumber } = settings;

		if (!actionInstance.isKey()) return;

		if (!slotNumber) {
			// No slot selected - grayed icon, no text
			await actionInstance.setImage(generateGrayedGuestIcon());
			await actionInstance.setTitle("");
			return;
		}

		const guest = this.guestsCache[slotNumber - 1];

		if (!guest) {
			// Empty slot - grayed icon, no text
			await actionInstance.setImage(generateGrayedGuestIcon());
			await actionInstance.setTitle("");
			return;
		}

		try {
			const avatarDataUri = await getGuestAvatar(guest.avatarUrl, guest.displayName);
			await actionInstance.setImage(avatarDataUri);
			await actionInstance.setTitle(wrapTitle(guest.displayName));
		} catch (error) {
			streamDeck.logger.error("[GuestSlot] Failed to update button:", error);
		}
	}
}
