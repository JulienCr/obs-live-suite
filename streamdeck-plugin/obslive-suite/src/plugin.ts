/**
 * OBS Live Suite Stream Deck Plugin
 * Main entry point
 */

import streamDeck, { LogLevel } from "@elgato/streamdeck";

// Import all actions
import { LowerThirdGuest } from "./actions/lower-third-guest";
import { LowerThirdCustom } from "./actions/lower-third-custom";
import { LowerThirdHide } from "./actions/lower-third-hide";
import { CountdownStart } from "./actions/countdown-start";
import { CountdownControl } from "./actions/countdown-control";
import { CountdownAddTime } from "./actions/countdown-addtime";
import { PosterShow } from "./actions/poster-show";
import { PosterControl } from "./actions/poster-control";
import { OBSSendAction } from "./actions/obs-send-action";
import { DSKSetScene } from "./actions/dsk-set-scene";
import { PanicButton } from "./actions/panic-button";

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
streamDeck.actions.registerAction(new OBSSendAction());
streamDeck.actions.registerAction(new DSKSetScene());
streamDeck.actions.registerAction(new PanicButton());

streamDeck.logger.info("OBS Live Suite plugin loaded - 11 actions registered");

// Connect WebSocket for real-time updates
wsManager.connect();

// Connect to Stream Deck
streamDeck.connect();
