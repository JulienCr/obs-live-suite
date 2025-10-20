/**
 * Property Inspector for Start Countdown
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
	const seconds = settings.seconds || 300;
	document.getElementById('seconds').value = seconds;
	highlightPreset(seconds);
}

function setPreset(seconds) {
	document.getElementById('seconds').value = seconds;
	highlightPreset(seconds);
	saveSettings();
}

function highlightPreset(seconds) {
	const buttons = document.querySelectorAll('.preset-btn');
	buttons.forEach(btn => {
		btn.classList.remove('active');
		if (parseInt(btn.dataset.seconds) === seconds) {
			btn.classList.add('active');
		}
	});
}

function saveSettings() {
	if (websocket && websocket.readyState === 1) {
		const seconds = parseInt(document.getElementById('seconds').value) || 300;

		websocket.send(JSON.stringify({
			action: actionInfo.action,
			event: 'setSettings',
			context: uuid,
			payload: { seconds }
		}));
	}
}

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('seconds').addEventListener('change', function () {
		highlightPreset(parseInt(this.value));
		saveSettings();
	});

	document.querySelectorAll('.preset-btn').forEach(btn => {
		btn.addEventListener('click', function () {
			setPreset(parseInt(this.dataset.seconds));
		});
	});
});

