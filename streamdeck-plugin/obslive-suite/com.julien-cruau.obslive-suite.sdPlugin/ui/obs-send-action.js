/**
 * Property Inspector for OBS Send Action
 */

let websocket = null;
let uuid = null;
let actionInfo = {};
let settings = {};
let requestTypes = [];

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
		requestRequestTypes();
	};

	websocket.onmessage = function (evt) {
		try {
			const data = JSON.parse(evt.data);
			handleMessage(data);
		} catch (error) {
			console.error('Failed to parse message:', error);
		}
	};
}

function handleMessage(data) {
	if (data.event === 'sendToPropertyInspector') {
		const payload = data.payload;
		
		if (payload.event === 'requestTypesList') {
			requestTypes = payload.requestTypes;
			populateRequestTypes(payload.requestTypes);
		} else if (payload.event === 'connectionTestResult') {
			showTestResult(payload.success, payload.message);
		}
	}
}

function loadSettings() {
	document.getElementById('password').value = settings.password || '';
	document.getElementById('requestTypeMode').value = settings.requestTypeMode || 'predefined';
	document.getElementById('requestType').value = settings.requestType || '';
	document.getElementById('customRequestType').value = settings.customRequestType || '';
	document.getElementById('requestData').value = settings.requestData || '';
	
	// Update UI based on mode
	updateRequestTypeMode();
}

function saveSettings() {
	if (websocket && websocket.readyState === 1) {
		const mode = document.getElementById('requestTypeMode').value;
		const payload = {
			password: document.getElementById('password').value,
			requestTypeMode: mode,
			requestType: mode === 'predefined' ? document.getElementById('requestType').value : document.getElementById('customRequestType').value,
			customRequestType: document.getElementById('customRequestType').value,
			requestData: document.getElementById('requestData').value
		};

		websocket.send(JSON.stringify({
			action: actionInfo.action,
			event: 'setSettings',
			context: uuid,
			payload: payload
		}));
	}
}

function requestRequestTypes() {
	if (websocket && websocket.readyState === 1) {
		websocket.send(JSON.stringify({
			action: actionInfo.action,
			event: 'sendToPlugin',
			context: uuid,
			payload: { event: 'refreshRequestTypes' }
		}));
	}
}

function populateRequestTypes(types) {
	const select = document.getElementById('requestType');
	const savedValue = settings.requestType || '';
	
	// Clear existing options except the first one
	select.innerHTML = '<option value="">-- Select Request Type --</option>';
	
	// Group by category
	const categories = {};
	types.forEach(type => {
		if (!categories[type.category]) {
			categories[type.category] = [];
		}
		categories[type.category].push(type);
	});
	
	// Add options grouped by category
	Object.keys(categories).sort().forEach(category => {
		const optgroup = document.createElement('optgroup');
		optgroup.label = category;
		
		categories[category].forEach(type => {
			const option = document.createElement('option');
			option.value = type.value;
			option.textContent = type.label;
			if (type.params) {
				option.setAttribute('data-params', JSON.stringify(type.params));
			}
			optgroup.appendChild(option);
		});
		
		select.appendChild(optgroup);
	});
	
	// Restore saved selection
	select.value = savedValue;
}

function testConnection() {
	const testButton = document.getElementById('testConnection');
	const testResult = document.getElementById('testResult');
	
	testButton.disabled = true;
	testButton.textContent = 'Testing...';
	testResult.style.display = 'none';
	
	if (websocket && websocket.readyState === 1) {
		websocket.send(JSON.stringify({
			action: actionInfo.action,
			event: 'sendToPlugin',
			context: uuid,
			payload: {
				event: 'testConnection',
				password: document.getElementById('password').value
			}
		}));
	}
	
	// Reset button after 5 seconds
	setTimeout(() => {
		testButton.disabled = false;
		testButton.textContent = 'Test OBS Connection';
	}, 5000);
}

function showTestResult(success, message) {
	const testResult = document.getElementById('testResult');
	testResult.className = 'test-result ' + (success ? 'success' : 'error');
	testResult.textContent = message;
	testResult.style.display = 'block';
	
	// Hide after 5 seconds
	setTimeout(() => {
		testResult.style.display = 'none';
	}, 5000);
}

function loadExample(exampleType) {
	const examples = {
		setScene: {
			requestType: 'SetCurrentProgramScene',
			requestData: '{"sceneName": "Scene Name"}'
		},
		toggleStream: {
			requestType: 'ToggleStream',
			requestData: '{}'
		},
		toggleRecord: {
			requestType: 'ToggleRecord',
			requestData: '{}'
		},
		muteSource: {
			requestType: 'SetInputMute',
			requestData: '{"inputName": "Microphone", "inputMuted": true}'
		},
		showHideSource: {
			requestType: 'SetSceneItemEnabled',
			requestData: '{"sceneName": "Scene Name", "sceneItemId": 1, "sceneItemEnabled": true}'
		},
		customEvent: {
			requestType: 'BroadcastCustomEvent',
			requestData: '{"eventData": {"customField": "value"}}'
		}
	};
	
	const example = examples[exampleType];
	if (example) {
		document.getElementById('requestType').value = example.requestType;
		document.getElementById('requestData').value = example.requestData;
		saveSettings();
	}
}

// Auto-fill params hint when request type changes
function onRequestTypeChange() {
	const select = document.getElementById('requestType');
	const selectedOption = select.options[select.selectedIndex];
	const params = selectedOption.getAttribute('data-params');
	
	if (params && !document.getElementById('requestData').value) {
		const paramsObj = JSON.parse(params);
		const example = {};
		Object.keys(paramsObj).forEach(key => {
			const type = paramsObj[key];
			if (type === 'string') {
				example[key] = 'value';
			} else if (type === 'number') {
				example[key] = 0;
			} else if (type === 'boolean') {
				example[key] = true;
			} else if (type === 'object') {
				example[key] = {};
			}
		});
		document.getElementById('requestData').value = JSON.stringify(example, null, 2);
	}
	
	saveSettings();
}

function updateRequestTypeMode() {
	const mode = document.getElementById('requestTypeMode').value;
	const predefinedContainer = document.getElementById('predefinedRequestContainer');
	const customContainer = document.getElementById('customRequestContainer');
	
	if (mode === 'custom') {
		predefinedContainer.style.display = 'none';
		customContainer.style.display = 'block';
	} else {
		predefinedContainer.style.display = 'block';
		customContainer.style.display = 'none';
	}
}

function onRequestTypeModeChange() {
	updateRequestTypeMode();
	saveSettings();
}

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('password').addEventListener('input', saveSettings);
	document.getElementById('requestTypeMode').addEventListener('change', onRequestTypeModeChange);
	document.getElementById('requestType').addEventListener('change', onRequestTypeChange);
	document.getElementById('customRequestType').addEventListener('input', saveSettings);
	document.getElementById('requestData').addEventListener('input', saveSettings);
	document.getElementById('testConnection').addEventListener('click', testConnection);
	
	// Example buttons
	document.querySelectorAll('.example-button').forEach(button => {
		button.addEventListener('click', function() {
			loadExample(this.getAttribute('data-example'));
		});
	});
});

