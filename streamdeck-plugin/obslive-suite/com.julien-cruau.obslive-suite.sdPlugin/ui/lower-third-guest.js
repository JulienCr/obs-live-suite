/**
 * Property Inspector for Guest Lower Third
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
		requestGuestList();
	};

	websocket.onmessage = function (evt) {
		const jsonObj = JSON.parse(evt.data);
		console.log('[Guest PI] Received message:', jsonObj);
		if (jsonObj.event === 'sendToPropertyInspector') {
			handlePluginMessage(jsonObj.payload);
		}
	};
}

function loadSettings() {
	document.getElementById('guestId').value = settings.guestId || '';
	document.getElementById('side').value = settings.side || 'left';
	document.getElementById('duration').value = settings.duration || 8;
}

function handlePluginMessage(payload) {
	console.log('[Guest PI] Handling plugin message:', payload);
	if (payload.event === 'guestsList') {
		console.log('[Guest PI] Populating guests:', payload.guests?.length);
		populateGuests(payload.guests || []);
	} else if (payload.event === 'apiError') {
		console.log('[Guest PI] Showing error:', payload.message);
		showError(payload.message);
	}
}

function showError(message) {
	const select = document.getElementById('guestId');
	select.innerHTML = `<option value="">Error: ${message}</option>`;
}

function populateGuests(guests) {
	const select = document.getElementById('guestId');
	const currentValue = select.value;

	select.innerHTML = '<option value="">Select a guest...</option>';

	guests.forEach(guest => {
		const option = document.createElement('option');
		option.value = guest.id;
		option.textContent = guest.displayName + (guest.subtitle ? ` - ${guest.subtitle}` : '');
		select.appendChild(option);
	});

	select.value = currentValue;
}

function requestGuestList() {
	console.log('[Guest PI] Requesting guest list');
	sendToPlugin({ event: 'refreshGuests' });
}

function sendToPlugin(payload) {
	if (websocket && websocket.readyState === 1) {
		websocket.send(JSON.stringify({
			action: actionInfo.action,
			event: 'sendToPlugin',
			context: uuid,
			payload: payload
		}));
	}
}

function saveSettings() {
	if (websocket && websocket.readyState === 1) {
		const payload = {
			guestId: document.getElementById('guestId').value,
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
	document.getElementById('guestId').addEventListener('change', saveSettings);
	document.getElementById('side').addEventListener('change', saveSettings);
	document.getElementById('duration').addEventListener('change', saveSettings);
	document.getElementById('refreshBtn').addEventListener('click', requestGuestList);
});

