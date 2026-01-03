/**
 * Poster Bigpicture Action
 * Show a poster in fullscreen mode
 */

import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, SendToPluginEvent, JsonValue, PropertyInspectorDidAppearEvent, Action, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { APIClient, Poster } from "../utils/api-client";
import { getPosterImage } from "../utils/image-helper";

@action({ UUID: "com.julien-cruau.obslive-suite.poster.bigpicture" })
export class PosterBigpicture extends SingletonAction<PosterSettings> {
	private currentlyShownPosterId: string | null = null;
	private actionInstances: Map<string, Action<PosterSettings>> = new Map();
	private postersCache: Poster[] = [];

	override async onWillAppear(ev: WillAppearEvent<PosterSettings>): Promise<void> {
		// Track this action instance
		this.actionInstances.set(ev.action.id, ev.action);

		// Update button image and title with current poster selection
		await this.updateButtonDisplay(ev.action, ev.payload.settings);
	}

	override onWillDisappear(ev: WillDisappearEvent<PosterSettings>): void | Promise<void> {
		// Remove this action instance
		this.actionInstances.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PosterSettings>): Promise<void> {
		// Update button display when settings change
		await this.updateButtonDisplay(ev.action, ev.payload.settings);
	}

	override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent<PosterSettings>): Promise<void> {
		console.log("[Poster Bigpicture] Property Inspector appeared");
		// Send poster list to property inspector when it appears
		await this.sendPostersListToPI(ev);
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, PosterSettings>): Promise<void> {
		console.log("[Poster Bigpicture] Received sendToPlugin:", ev.payload);
		const payload = ev.payload as { event?: string };

		if (payload.event === "refreshPosters") {
			console.log("[Poster Bigpicture] Refreshing posters list");
			await this.sendPostersListToPI(ev);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<PosterSettings>): Promise<void> {
		const { posterId } = ev.payload.settings;

		if (!posterId) {
			await ev.action.showAlert();
			return;
		}

		try {
			// Toggle behavior: if same poster is already shown, hide it
			if (this.currentlyShownPosterId === posterId) {
				console.log("[Poster Bigpicture] Same poster already shown, hiding it");
				await APIClient.hidePosterBigpicture();
				this.currentlyShownPosterId = null;
				await ev.action.showOk();
			} else {
				// Get poster details from cache
				let poster = this.postersCache.find((p) => p.id === posterId);

				if (!poster) {
					const posters = await APIClient.getPosters();
					this.postersCache = posters;
					poster = posters.find((p) => p.id === posterId);
				}

				if (!poster) {
					console.error("[Poster Bigpicture] Poster not found:", posterId);
					await ev.action.showAlert();
					return;
				}

				console.log("[Poster Bigpicture] Showing poster:", poster.title);
				await APIClient.showPosterBigpicture(posterId, poster.fileUrl, poster.type);
				this.currentlyShownPosterId = posterId;
				await ev.action.showOk();
			}
		} catch (error) {
			console.error("[Poster Bigpicture] Failed:", error);
			await ev.action.showAlert();
		}
	}

	private async sendPostersListToPI(ev: SendToPluginEvent<JsonValue, PosterSettings> | PropertyInspectorDidAppearEvent<PosterSettings>): Promise<void> {
		try {
			console.log("[Poster Bigpicture] Fetching posters from API...");
			const posters = await APIClient.getPosters();
			console.log("[Poster Bigpicture] Fetched posters:", posters.length);

			// Cache posters for button image updates
			this.postersCache = posters;

			if (posters.length === 0) {
				console.log("[Poster Bigpicture] No posters found, sending error");
				await streamDeck.ui.current?.sendToPropertyInspector({
					event: "apiError",
					message: "No posters found",
				});
			} else {
				console.log("[Poster Bigpicture] Sending posters list to PI");
				await streamDeck.ui.current?.sendToPropertyInspector({
					event: "postersList",
					posters: posters,
				});
			}
		} catch (error) {
			console.error("[Poster Bigpicture] API Error:", error);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "apiError",
				message: `API error: ${(error as Error).message}`,
			});
		}
	}

	/**
	 * Update button image and title with poster data
	 */
	private async updateButtonDisplay(actionInstance: Action<PosterSettings>, settings: PosterSettings): Promise<void> {
		const { posterId } = settings;

		if (!posterId) {
			// No poster selected, clear image and title to default
			if (actionInstance.isKey()) {
				await actionInstance.setImage(undefined);
				await actionInstance.setTitle(undefined);
			}
			return;
		}

		try {
			// Find poster in cache or fetch
			let poster = this.postersCache.find((p) => p.id === posterId);

			if (!poster) {
				// Not in cache, fetch fresh list
				const posters = await APIClient.getPosters();
				this.postersCache = posters;
				poster = posters.find((p) => p.id === posterId);
			}

			if (!poster) {
				console.warn(`[Poster Bigpicture] Poster not found: ${posterId}`);
				return;
			}

			// Fetch and set poster image
			console.log(`[Poster Bigpicture] Fetching image for ${poster.title}...`);
			const posterImageUri = await getPosterImage(poster.fileUrl, poster.type, poster.title);

			if (actionInstance.isKey()) {
				await actionInstance.setImage(posterImageUri);
				await actionInstance.setTitle(poster.title);
				console.log(`[Poster Bigpicture] Image and title set for ${poster.title}`);
			}
		} catch (error) {
			console.error("[Poster Bigpicture] Failed to update button display:", error);
		}
	}
}

type PosterSettings = {
	posterId?: string;
};
