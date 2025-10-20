/**
 * Show Poster Action
 * Displays a poster from the database
 */

import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, SendToPluginEvent, JsonValue, PropertyInspectorDidAppearEvent } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";

@action({ UUID: "com.julien-cruau.obslive-suite.poster.show" })
export class PosterShow extends SingletonAction<PosterSettings> {
	private currentlyShownPosterId: string | null = null;

	override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent<PosterSettings>): Promise<void> {
		console.log("[Poster Show] Property Inspector appeared");
		// Send poster list to property inspector when it appears
		await this.sendPostersListToPI(ev);
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, PosterSettings>): Promise<void> {
		console.log("[Poster Show] Received sendToPlugin:", ev.payload);
		const payload = ev.payload as { event?: string };

		if (payload.event === "refreshPosters") {
			console.log("[Poster Show] Refreshing posters list");
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
				console.log("[Poster Show] Same poster already shown, hiding it");
				await APIClient.controlPoster("hide");
				this.currentlyShownPosterId = null;
				await ev.action.showOk();
			} else {
				console.log("[Poster Show] Showing poster:", posterId);
				await APIClient.showPoster(posterId);
				this.currentlyShownPosterId = posterId;
				await ev.action.showOk();
			}
		} catch (error) {
			console.error("[Poster Show] Failed:", error);
			await ev.action.showAlert();
		}
	}

	private async sendPostersListToPI(ev: SendToPluginEvent<JsonValue, PosterSettings> | PropertyInspectorDidAppearEvent<PosterSettings>): Promise<void> {
		try {
			console.log("[Poster Show] Fetching posters from API...");
			const posters = await APIClient.getPosters();
			console.log("[Poster Show] Fetched posters:", posters.length);

			if (posters.length === 0) {
				console.log("[Poster Show] No posters found, sending error");
				await streamDeck.ui.current?.sendToPropertyInspector({
					event: "apiError",
					message: "No posters found",
				});
			} else {
				console.log("[Poster Show] Sending posters list to PI");
				await streamDeck.ui.current?.sendToPropertyInspector({
					event: "postersList",
					posters: posters,
				});
			}
		} catch (error) {
			console.error("[Poster Show] API Error:", error);
			await streamDeck.ui.current?.sendToPropertyInspector({
				event: "apiError",
				message: `API error: ${(error as Error).message}`,
			});
		}
	}
}

type PosterSettings = {
	posterId?: string;
};

