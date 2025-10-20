/**
 * Start Countdown Action
 * Starts a countdown timer with live display on the button
 */

import { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, Action } from "@elgato/streamdeck";
import { APIClient } from "../utils/api-client";
import { wsManager, WebSocketManager, CountdownState } from "../utils/websocket-manager";

@action({ UUID: "com.julien-cruau.obslive-suite.countdown.start" })
export class CountdownStart extends SingletonAction<CountdownSettings> {
	private actionInstances: Map<string, Action<CountdownSettings>> = new Map();
	private boundCallback: ((state: CountdownState) => void) | null = null;

	constructor() {
		super();

		// Create callback for countdown updates
		this.boundCallback = (state: CountdownState) => {
			this.updateAllButtons(state);
		};

		// Register callback
		wsManager.onCountdownUpdate(this.boundCallback);
	}

	override onWillAppear(ev: WillAppearEvent<CountdownSettings>): void | Promise<void> {
		// Track this action instance
		this.actionInstances.set(ev.action.id, ev.action);

		// Update with current countdown state
		const currentState = wsManager.getCountdownState();
		this.updateButtonTitle(ev.action, currentState);
	}

	override onWillDisappear(ev: WillDisappearEvent<CountdownSettings>): void | Promise<void> {
		// Remove this action instance
		this.actionInstances.delete(ev.action.id);
	}

	override async onKeyDown(ev: KeyDownEvent<CountdownSettings>): Promise<void> {
		const { seconds = 300 } = ev.payload.settings;

		try {
			await APIClient.startCountdown(seconds);
			await ev.action.showOk();
		} catch (error) {
			console.error("[Countdown Start] Failed:", error);
			await ev.action.showAlert();
		}
	}

	/**
	 * Update all tracked button instances with current countdown state
	 */
	private updateAllButtons(state: CountdownState): void {
		this.actionInstances.forEach((actionInstance) => {
			this.updateButtonTitle(actionInstance, state);
		});
	}

	/**
	 * Update a single button title with current countdown state
	 */
	private updateButtonTitle(actionInstance: Action<CountdownSettings>, state: CountdownState): void {
		const timeString = WebSocketManager.formatTime(state.seconds);
		const title = state.running ? timeString : state.seconds > 0 ? timeString : "";

		// setTitle is only available on KeyAction
		if (actionInstance.isKey()) {
			void actionInstance.setTitle(title);
		}
	}
}

type CountdownSettings = {
	seconds?: number;
};

