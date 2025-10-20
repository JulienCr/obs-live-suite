/**
 * Property Inspector for Show Poster
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
		requestPosterList();
	};

	websocket.onmessage = function (evt) {
		const jsonObj = JSON.parse(evt.data);
		console.log('[Poster PI] Received message:', jsonObj);
		if (jsonObj.event === 'sendToPropertyInspector') {
			handlePluginMessage(jsonObj.payload);
		}
	};
}

function loadSettings() {
	document.getElementById('posterId').value = settings.posterId || '';
}

function handlePluginMessage(payload) {
	console.log('[Poster PI] Handling plugin message:', payload);
	if (payload.event === 'postersList') {
		console.log('[Poster PI] Populating posters:', payload.posters?.length);
		populatePosters(payload.posters || []);
	} else if (payload.event === 'apiError') {
		console.log('[Poster PI] Showing error:', payload.message);
		showError(payload.message);
	}
}

function showError(message) {
	const select = document.getElementById('posterId');
	select.innerHTML = `<option value="">Error: ${message}</option>`;
}

function populatePosters(posters) {
	const select = document.getElementById('posterId');
	const currentValue = select.value;

	select.innerHTML = '<option value="">Select a poster...</option>';

	posters.forEach(poster => {
		const option = document.createElement('option');
		option.value = poster.id;
		option.textContent = poster.title;
		select.appendChild(option);
	});

	select.value = currentValue;
}

function requestPosterList() {
	console.log('[Poster PI] Requesting poster list');
	sendToPlugin({ event: 'refreshPosters' });
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
			posterId: document.getElementById('posterId').value
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
	document.getElementById('posterId').addEventListener('change', saveSettings);
	document.getElementById('refreshBtn').addEventListener('click', requestPosterList);
});

