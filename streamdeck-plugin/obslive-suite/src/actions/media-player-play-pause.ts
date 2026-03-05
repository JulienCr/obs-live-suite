/**
 * Media Player Play/Pause Action
 * Toggles play/pause and shows track info on the button.
 */

import { action, KeyAction, KeyDownEvent, streamDeck, WillDisappearEvent } from "@elgato/streamdeck";
import { MediaPlayerBase, MediaPlayerActionSettings, MediaPlayerCommand, resolveDriverId } from "./media-player-base";
import { wsManager, MediaPlayerState } from "../utils/websocket-manager";
import { generatePlayIcon, generatePauseIcon, getDriverColors } from "../utils/media-player-icons";
import { fetchImageAsBase64 } from "../utils/image-helper";
import { marqueeManager } from "../utils/marquee-manager";

@action({ UUID: "com.julien-cruau.obslive-suite.media-player.play-pause" })
export class MediaPlayerPlayPause extends MediaPlayerBase {
	protected override readonly tracksState = true;

	/** Cache last fetched artwork to avoid re-fetching on every status update */
	private artworkCache = new Map<string, { url: string; dataUri: string }>();

	override async onKeyDown(ev: KeyDownEvent<MediaPlayerActionSettings>): Promise<void> {
		const driverId = resolveDriverId(ev.payload.settings);
		const state = wsManager.getMediaPlayerState(driverId);
		const command: MediaPlayerCommand = state?.playing ? "pause" : "play";

		try {
			await this.sendCommand(driverId, command);
		} catch (error) {
			streamDeck.logger.error(`[MediaPlayer] ${command} failed:`, error);
			await ev.action.showAlert();
		}
	}

	protected override async updateButton(
		actionInstance: KeyAction<MediaPlayerActionSettings>,
		driverId: string,
		state: MediaPlayerState,
	): Promise<void> {
		const { bg, accent } = getDriverColors(driverId);

		// Try artwork with play/pause overlay, fall back to plain icon
		const artworkDataUri = await this.getArtwork(actionInstance.id, state.artworkUrl);
		if (artworkDataUri) {
			await actionInstance.setImage(generateArtworkWithOverlay(artworkDataUri, state.playing, accent));
		} else if (state.playing) {
			await actionInstance.setImage(generatePauseIcon(bg, accent));
		} else {
			await actionInstance.setImage(generatePlayIcon(bg, accent));
		}

		if (state.artist || state.track) {
			marqueeManager.set(actionInstance.id, actionInstance, state.artist || "", state.track || "");
		} else {
			await marqueeManager.clear(actionInstance.id, actionInstance);
		}
	}

	private async getArtwork(actionId: string, artworkUrl: string): Promise<string | null> {
		if (!artworkUrl) return null;

		const cached = this.artworkCache.get(actionId);
		if (cached && cached.url === artworkUrl) return cached.dataUri;

		try {
			const dataUri = await fetchImageAsBase64(artworkUrl);
			this.artworkCache.set(actionId, { url: artworkUrl, dataUri });
			return dataUri;
		} catch {
			return null;
		}
	}

	override onWillDisappear(ev: WillDisappearEvent<MediaPlayerActionSettings>): void {
		marqueeManager.remove(ev.action.id);
		this.artworkCache.delete(ev.action.id);
		super.onWillDisappear(ev);
	}
}

/** Composite SVG: artwork background with scrim + driver-colored play/pause icon.
 * Uses base64 encoding (not encodeURIComponent) to safely embed the artwork data URI. */
function generateArtworkWithOverlay(artworkDataUri: string, playing: boolean, accent: string): string {
	const icon = playing
		? `<rect x="46" y="44" width="16" height="56" rx="3" fill="${accent}"/>
		   <rect x="82" y="44" width="16" height="56" rx="3" fill="${accent}"/>`
		: `<polygon points="56,42 56,102 104,72" fill="${accent}"/>`;

	const svg = `<svg width="144" height="144" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
		<image xlink:href="${artworkDataUri}" x="0" y="0" width="144" height="144" preserveAspectRatio="xMidYMid slice"/>
		<rect width="144" height="144" fill="black" opacity="0.55"/>
		${icon}
	</svg>`;

	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
