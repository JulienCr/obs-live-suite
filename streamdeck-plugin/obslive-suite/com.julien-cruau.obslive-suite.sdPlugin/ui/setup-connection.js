/**
 * Property Inspector for Setup Connection
 */

let websocket = null;
let uuid = null;
let actionInfo = {};
let currentConfig = {
	host: 'localhost',
	port: 3000,
	useHttps: true,
	trustSelfSigned: true
};

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
	uuid = inUUID;
	actionInfo = JSON.parse(inActionInfo);

	websocket = new WebSocket('ws://127.0.0.1:' + inPort);

	websocket.onopen = function () {
		const json = {
			event: inRegisterEvent,
			uuid: uuid
		};
		websocket.send(JSON.stringify(json));

		// Request current configuration
		sendToPlugin({ event: 'getConfig' });
	};

	websocket.onmessage = function (evt) {
		const jsonObj = JSON.parse(evt.data);
		console.log('[Setup PI] Received message:', jsonObj);
		if (jsonObj.event === 'sendToPropertyInspector') {
			handlePluginMessage(jsonObj.payload);
		}
	};
}

function handlePluginMessage(payload) {
	console.log('[Setup PI] Handling plugin message:', payload);

	switch (payload.event) {
		case 'configLoaded':
		case 'configSaved':
			loadConfig(payload.config, payload.urls);
			if (payload.event === 'configSaved') {
				showStatus('success', 'Configuration saved');
			}
			break;

		case 'testResult':
			handleTestResult(payload);
			break;

		case 'error':
			showStatus('error', payload.message);
			break;

		default:
			console.warn('[Setup PI] Unknown event:', payload.event);
	}
}

function loadConfig(config, urls) {
	if (config) {
		currentConfig = config;
		document.getElementById('host').value = config.host || 'localhost';
		document.getElementById('port').value = config.port || 3000;
		document.getElementById('useHttps').checked = config.useHttps !== false;
		document.getElementById('trustSelfSigned').checked = config.trustSelfSigned !== false;
	}

	if (urls) {
		updateUrlsPreview(urls);
	} else {
		updateUrlsPreviewFromInputs();
	}
}

function updateUrlsPreview(urls) {
	const preview = document.getElementById('urlsPreview');
	preview.innerHTML = `
		App: ${urls.nextjs}<br>
		Backend: ${urls.backend}<br>
		WebSocket: ${urls.websocket}
	`;
}

function updateUrlsPreviewFromInputs() {
	const host = document.getElementById('host').value || 'localhost';
	const port = parseInt(document.getElementById('port').value) || 3000;
	const useHttps = document.getElementById('useHttps').checked;

	const httpProtocol = useHttps ? 'https' : 'http';
	const wsProtocol = useHttps ? 'wss' : 'ws';

	const preview = document.getElementById('urlsPreview');
	preview.innerHTML = `
		App: ${httpProtocol}://${host}:${port}<br>
		Backend: ${httpProtocol}://${host}:${port + 2}<br>
		WebSocket: ${wsProtocol}://${host}:${port + 3}
	`;
}

function handleTestResult(result) {
	if (result.success) {
		let details = 'Connected';
		if (result.wsRunning !== undefined) {
			details += result.wsRunning ? ', WS OK' : ', WS down';
		}
		if (result.obsConnected !== undefined) {
			details += result.obsConnected ? ', OBS OK' : '';
		}
		showStatus('success', details);
	} else {
		showStatus('error', result.error || 'Connection failed');
	}
}

function showStatus(status, message) {
	const dot = document.getElementById('statusDot');
	const text = document.getElementById('statusText');

	dot.className = 'status-dot';
	if (status === 'success') {
		dot.classList.add('success');
	} else if (status === 'error') {
		dot.classList.add('error');
	} else if (status === 'testing') {
		dot.classList.add('testing');
	}

	text.textContent = message;
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

function testConnection() {
	showStatus('testing', 'Testing...');
	sendToPlugin({ event: 'testConnection' });
}

function saveConfig() {
	const config = {
		host: document.getElementById('host').value || 'localhost',
		port: parseInt(document.getElementById('port').value) || 3000,
		useHttps: document.getElementById('useHttps').checked,
		trustSelfSigned: document.getElementById('trustSelfSigned').checked
	};

	console.log('[Setup PI] Saving config:', config);
	sendToPlugin({ event: 'saveConfig', config: config });
}

document.addEventListener('DOMContentLoaded', function () {
	// Update URL preview when inputs change
	document.getElementById('host').addEventListener('input', updateUrlsPreviewFromInputs);
	document.getElementById('port').addEventListener('input', updateUrlsPreviewFromInputs);
	document.getElementById('useHttps').addEventListener('change', updateUrlsPreviewFromInputs);

	// Button handlers
	document.getElementById('testBtn').addEventListener('click', testConnection);
	document.getElementById('saveBtn').addEventListener('click', saveConfig);
});
