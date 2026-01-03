/**
 * Poster Slot Action
 * Auto-populated poster button based on slot number
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
import { APIClient, Poster } from "../utils/api-client";
import { getPosterImage, generateVideoIcon, generateGrayedPosterIcon } from "../utils/image-helper";
import { wrapTitle } from "../utils/title-helper";

type PosterSlotSettings = {
	slotNumber?: number;
};

// Shared state for poster toggle behavior
let currentlyShownPosterId: string | null = null;

@action({ UUID: "com.julien-cruau.obslive-suite.poster.show.slot" })
export class PosterSlot extends SingletonAction<PosterSlotSettings> {
	private actionInstances: Map<string, Action<PosterSlotSettings>> = new Map();
	private postersCache: Poster[] = [];
	private refreshInterval: ReturnType<typeof setInterval> | null = null;

	override async onWillAppear(ev: WillAppearEvent<PosterSlotSettings>): Promise<void> {
		this.actionInstances.set(ev.action.id, ev.action);

		// Start polling if first instance
		if (this.actionInstances.size === 1) {
			this.startPolling();
		}

		// Update this button
		await this.updateButtonDisplay(ev.action, ev.payload.settings);
	}

	override onWillDisappear(ev: WillDisappearEvent<PosterSlotSettings>): void {
		this.actionInstances.delete(ev.action.id);

		// Stop polling if no more instances
		if (this.actionInstances.size === 0) {
			this.stopPolling();
		}
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PosterSlotSettings>): Promise<void> {
		await this.updateButtonDisplay(ev.action, ev.payload.settings);
	}

	override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent<PosterSlotSettings>): Promise<void> {
		// Send slot options and current poster info to PI
		const settings = await ev.action.getSettings();
		await this.sendSlotInfoToPI(settings);
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, PosterSlotSettings>): Promise<void> {
		const payload = ev.payload as { event?: string };

		if (payload.event === "refresh") {
			streamDeck.logger.info("[PosterSlot] Manual refresh triggered");
			await this.refreshPosters();
			await this.sendSlotInfoToPI(ev.action.getSettings() as unknown as PosterSlotSettings);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<PosterSlotSettings>): Promise<void> {
		const { slotNumber } = ev.payload.settings;

		if (!slotNumber) {
			await ev.action.showAlert();
			return;
		}

		const poster = this.postersCache[slotNumber - 1];

		if (!poster) {
			// Empty slot
			await ev.action.showAlert();
			return;
		}

		try {
			// Toggle behavior: if same poster is already shown, hide it
			if (currentlyShownPosterId === poster.id) {
				streamDeck.logger.info("[PosterSlot] Same poster already shown, hiding it");
				await APIClient.controlPoster("hide");
				currentlyShownPosterId = null;
				await ev.action.showOk();
			} else {
				streamDeck.logger.info(`[PosterSlot] Showing poster: ${poster.title}`);
				await APIClient.showPoster(poster.id);
				currentlyShownPosterId = poster.id;
				await ev.action.showOk();
			}
		} catch (error) {
			streamDeck.logger.error("[PosterSlot] Failed:", error);
			await ev.action.showAlert();
		}
	}

	private startPolling(): void {
		if (this.refreshInterval) return;

		streamDeck.logger.info("[PosterSlot] Starting polling (30s interval)");
		this.refreshPosters();

		this.refreshInterval = setInterval(() => {
			this.refreshPosters();
		}, 30000);
	}

	private stopPolling(): void {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = null;
			streamDeck.logger.info("[PosterSlot] Stopped polling");
		}
	}

	private async refreshPosters(): Promise<void> {
		try {
			this.postersCache = await APIClient.getPosters();
			streamDeck.logger.info(`[PosterSlot] Refreshed: ${this.postersCache.length} posters`);

			// Update all button instances
			for (const [, actionInstance] of this.actionInstances) {
				const settings = await actionInstance.getSettings();
				await this.updateButtonDisplay(actionInstance, settings);
			}
		} catch (error) {
			streamDeck.logger.error("[PosterSlot] Failed to refresh posters:", error);
		}
	}

	private async sendSlotInfoToPI(settings: PosterSlotSettings): Promise<void> {
		const slotNumber = settings.slotNumber || 0;
		const poster = slotNumber > 0 ? this.postersCache[slotNumber - 1] : null;

		await streamDeck.ui.current?.sendToPropertyInspector({
			event: "slotInfo",
			slotNumber: slotNumber,
			poster: poster,
			totalPosters: this.postersCache.length,
		});
	}

	private async updateButtonDisplay(actionInstance: Action<PosterSlotSettings>, settings: PosterSlotSettings): Promise<void> {
		const { slotNumber } = settings;

		if (!actionInstance.isKey()) return;

		if (!slotNumber) {
			// No slot selected - grayed icon, no text
			await actionInstance.setImage(generateGrayedPosterIcon());
			await actionInstance.setTitle("");
			return;
		}

		const poster = this.postersCache[slotNumber - 1];

		if (!poster) {
			// Empty slot - grayed icon, no text
			await actionInstance.setImage(generateGrayedPosterIcon());
			await actionInstance.setTitle("");
			return;
		}

		try {
			// Video/YouTube posters: grayed icon, no title
			if (poster.type === "video" || poster.type === "youtube") {
				await actionInstance.setImage(generateVideoIcon());
				await actionInstance.setTitle("");
			} else {
				// Image posters: show image + title
				const posterImageUri = await getPosterImage(poster.fileUrl, poster.type, poster.title);
				await actionInstance.setImage(posterImageUri);
				await actionInstance.setTitle(wrapTitle(poster.title));
			}
		} catch (error) {
			streamDeck.logger.error("[PosterSlot] Failed to update button:", error);
		}
	}
}
