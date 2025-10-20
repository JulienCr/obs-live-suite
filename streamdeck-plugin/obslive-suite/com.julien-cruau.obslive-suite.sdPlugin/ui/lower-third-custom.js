/**
 * Property Inspector for Custom Lower Third
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
	document.getElementById('title').value = settings.title || '';
	document.getElementById('subtitle').value = settings.subtitle || '';
	document.getElementById('side').value = settings.side || 'left';
	document.getElementById('duration').value = settings.duration || 8;
}

function saveSettings() {
	if (websocket && websocket.readyState === 1) {
		const payload = {
			title: document.getElementById('title').value,
			subtitle: document.getElementById('subtitle').value,
			side: document.getElementById('side').value,
			duration: parseInt(document.getElementById('duration').value) || 8
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
	document.getElementById('title').addEventListener('input', saveSettings);
	document.getElementById('subtitle').addEventListener('input', saveSettings);
	document.getElementById('side').addEventListener('change', saveSettings);
	document.getElementById('duration').addEventListener('change', saveSettings);
});

