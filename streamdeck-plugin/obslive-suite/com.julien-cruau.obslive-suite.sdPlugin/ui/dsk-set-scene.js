/**
 * Property Inspector for DSK Set Scene
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
		requestDSKList();
	};

	websocket.onmessage = function (evt) {
		const jsonObj = JSON.parse(evt.data);
		console.log('[DSK PI] Received message:', jsonObj);
		if (jsonObj.event === 'sendToPropertyInspector') {
			handlePluginMessage(jsonObj.payload);
		}
	};
}

function loadSettings() {
	document.getElementById('dskName').value = settings.dskName || '';
	document.getElementById('scene').value = settings.scene || '';
}

function handlePluginMessage(payload) {
	console.log('[DSK PI] Handling plugin message:', JSON.stringify(payload));
	if (payload.event === 'dsksList') {
		console.log('[DSK PI] Received dsksList event');
		console.log('[DSK PI] DSKs array:', payload.dsks);
		console.log('[DSK PI] DSKs length:', payload.dsks?.length);
		populateDSKs(payload.dsks || []);
	} else if (payload.event === 'dskScenesList') {
		console.log('[DSK PI] Received dskScenesList event');
		console.log('[DSK PI] DSK name:', payload.dskName);
		console.log('[DSK PI] Scenes array:', payload.scenes);
		console.log('[DSK PI] Current scene:', payload.currentScene);
		populateScenes(payload.scenes || [], payload.currentScene);
	} else if (payload.event === 'apiError') {
		console.log('[DSK PI] Received apiError event');
		console.log('[DSK PI] Error message:', payload.message);
		showError(payload.message);
	} else if (payload.event === 'debugResponse') {
		console.log('[DSK PI] Received debugResponse event');
		showDebugOutput(payload.data);
	} else {
		console.log('[DSK PI] Unknown event type:', payload.event);
	}
}

function showError(message) {
	// Could show error in a dedicated element, for now just log
	console.error('[DSK PI] Error:', message);
}

function showDebugOutput(data) {
	const textarea = document.getElementById('debugOutput');
	textarea.value = JSON.stringify(data, null, 2);
	console.log('[DSK PI] Debug output:', data);
}

function testDSKCommunication() {
	console.log('[DSK PI] Testing DSK communication');
	sendToPlugin({ event: 'testDSK' });
}

function populateDSKs(dsks) {
	console.log('[DSK PI] populateDSKs called with:', dsks);
	const select = document.getElementById('dskName');
	const savedValue = settings.dskName || '';
	console.log('[DSK PI] Saved DSK value:', savedValue);

	select.innerHTML = '<option value="">Select DSK...</option>';

	console.log('[DSK PI] Populating', dsks.length, 'DSKs');
	dsks.forEach((dsk, index) => {
		console.log(`[DSK PI] Adding DSK ${index}:`, dsk);
		const option = document.createElement('option');
		option.value = dsk;
		option.textContent = dsk;
		select.appendChild(option);
	});

	select.value = savedValue;
	console.log('[DSK PI] Select value set to:', select.value);

	// If we have a saved DSK, request its scenes
	if (savedValue) {
		console.log('[DSK PI] Requesting scenes for saved DSK:', savedValue);
		requestDSKScenes(savedValue);
	}
}

function populateScenes(scenes, currentScene) {
	console.log('[DSK PI] populateScenes called with:', scenes, 'current:', currentScene);
	const select = document.getElementById('scene');
	const savedValue = settings.scene || '';
	console.log('[DSK PI] Saved scene value:', savedValue);

	select.innerHTML = '<option value="">Select Scene...</option>';

	console.log('[DSK PI] Populating', scenes.length, 'scenes');
	scenes.forEach((scene, index) => {
		console.log(`[DSK PI] Adding scene ${index}:`, scene);
		console.log(`[DSK PI] Scene characters:`, Array.from(scene).map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
		
		const option = document.createElement('option');
		// Use setAttribute to ensure exact value without HTML entity conversion
		option.setAttribute('value', scene);
		option.textContent = scene;
		select.appendChild(option);
	});

	select.value = savedValue;
	console.log('[DSK PI] Scene select value set to:', select.value);
	console.log('[DSK PI] All option values:', Array.from(select.options).map(o => o.value));
}

function requestDSKList() {
	console.log('[DSK PI] Requesting DSK list');
	sendToPlugin({ event: 'refreshDSKs' });
}

function requestDSKScenes(dskName) {
	console.log('[DSK PI] Requesting scenes for DSK:', dskName);
	sendToPlugin({ event: 'getDSKScenes', dskName });
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
			dskName: document.getElementById('dskName').value,
			scene: document.getElementById('scene').value
		};

		console.log('[DSK PI] Saving settings:', payload);

		websocket.send(JSON.stringify({
			action: actionInfo.action,
			event: 'setSettings',
			context: uuid,
			payload: payload
		}));
	}
}

function onDSKChange() {
	const dskName = document.getElementById('dskName').value;
	
	// Clear scene selection when DSK changes
	document.getElementById('scene').innerHTML = '<option value="">Select Scene...</option>';
	
	// Request scenes for new DSK
	if (dskName) {
		requestDSKScenes(dskName);
	}
	
	saveSettings();
}

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('dskName').addEventListener('change', onDSKChange);
	document.getElementById('scene').addEventListener('change', saveSettings);
	document.getElementById('refreshBtn').addEventListener('click', requestDSKList);
	document.getElementById('testBtn').addEventListener('click', testDSKCommunication);
});

