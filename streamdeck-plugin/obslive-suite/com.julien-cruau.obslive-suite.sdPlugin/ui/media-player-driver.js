/**
 * Property Inspector for Media Player Driver
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
	document.getElementById('driverId').value = settings.driverId || 'artlist';
}

function saveSettings() {
	if (websocket && websocket.readyState === 1) {
		const payload = {
			driverId: document.getElementById('driverId').value
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
	document.getElementById('driverId').addEventListener('change', saveSettings);
});
