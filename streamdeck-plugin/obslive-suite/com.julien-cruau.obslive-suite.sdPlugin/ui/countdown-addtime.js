/**
 * Property Inspector for Add Time to Countdown
 */

let websocket = null;
let uuid = null;
let actionInfo = {};
let settings = {};

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
	uuid = inUUID;
	actionInfo = JSON.parse(inActionInfo);
	settings = actionInfo.payload.settings || {};

	websocket = new WebSocket('ws://127.0.0.1:' + inPort);

	websocket.onopen = function () {
		const json = {
			event: inRegisterEvent,
			uuid: uuid
		};
		websocket.send(JSON.stringify(json));
		loadSettings();
	};
}

function loadSettings() {
	document.getElementById('seconds').value = settings.seconds || 30;
}

function saveSettings() {
	if (websocket && websocket.readyState === 1) {
		const payload = {
			seconds: parseInt(document.getElementById('seconds').value) || 30
		};

		websocket.send(JSON.stringify({
			action: actionInfo.action,
			event: 'setSettings',
			context: uuid,
			payload: payload
		}));
	}
}

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('seconds').addEventListener('change', saveSettings);
});

