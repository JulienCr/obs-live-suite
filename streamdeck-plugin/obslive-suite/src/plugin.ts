/**
 * OBS Live Suite Stream Deck Plugin
 * Main entry point
 */

import streamDeck, { LogLevel } from "@elgato/streamdeck";

// Import configuration manager
import { ConfigManager } from "./utils/config-manager";

// Import all actions
import { LowerThirdGuest } from "./actions/lower-third-guest";
import { LowerThirdCustom } from "./actions/lower-third-custom";
import { LowerThirdHide } from "./actions/lower-third-hide";
import { CountdownStart } from "./actions/countdown-start";
import { CountdownControl } from "./actions/countdown-control";
import { CountdownAddTime } from "./actions/countdown-addtime";
import { PosterShow } from "./actions/poster-show";
import { PosterControl } from "./actions/poster-control";
import { PosterBigpicture } from "./actions/poster-bigpicture";
import { OBSSendAction } from "./actions/obs-send-action";
import { OBSRecordToggle } from "./actions/obs-record-toggle";
import { OBSStreamToggle } from "./actions/obs-stream-toggle";
import { OBSSceneSwitch } from "./actions/obs-scene-switch";
import { DSKSetScene } from "./actions/dsk-set-scene";
import { PanicButton } from "./actions/panic-button";
import { SetupConnection } from "./actions/setup-connection";
import { GuestSlot } from "./actions/guest-slot";
import { PosterSlot } from "./actions/poster-slot";

// Import WebSocket manager
import { wsManager } from "./utils/websocket-manager";

// Set log level (use INFO in production, TRACE for debugging)
streamDeck.logger.setLevel(LogLevel.INFO);

// Register all actions
streamDeck.actions.registerAction(new LowerThirdGuest());
streamDeck.actions.registerAction(new LowerThirdCustom());
streamDeck.actions.registerAction(new LowerThirdHide());
streamDeck.actions.registerAction(new CountdownStart());
streamDeck.actions.registerAction(new CountdownControl());
streamDeck.actions.registerAction(new CountdownAddTime());
streamDeck.actions.registerAction(new PosterShow());
streamDeck.actions.registerAction(new PosterControl());
streamDeck.actions.registerAction(new PosterBigpicture());
streamDeck.actions.registerAction(new OBSSendAction());
streamDeck.actions.registerAction(new OBSRecordToggle());
streamDeck.actions.registerAction(new OBSStreamToggle());
streamDeck.actions.registerAction(new OBSSceneSwitch());
streamDeck.actions.registerAction(new DSKSetScene());
streamDeck.actions.registerAction(new PanicButton());
streamDeck.actions.registerAction(new SetupConnection());
streamDeck.actions.registerAction(new GuestSlot());
streamDeck.actions.registerAction(new PosterSlot());

streamDeck.logger.info("OBS Live Suite plugin loaded - 18 actions registered");

// Initialize configuration and connect services
async function initializePlugin(): Promise<void> {
	try {
		// Initialize configuration manager first
		await ConfigManager.initialize();

		// Connect WebSocket for real-time updates (uses ConfigManager for URL)
		wsManager.connect();

		streamDeck.logger.info("Plugin initialization complete");
	} catch (error) {
		streamDeck.logger.error("Plugin initialization failed:", error);
	}
}

// Start initialization after Stream Deck connects
initializePlugin();

// Connect to Stream Deck
streamDeck.connect();
