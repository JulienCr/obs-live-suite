/**
 * Property Inspector for Guest Slot
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

		populateSlotDropdown();
		loadSettings();
	};

	websocket.onmessage = function (evt) {
		const jsonObj = JSON.parse(evt.data);
		console.log('[GuestSlot PI] Received message:', jsonObj);
		if (jsonObj.event === 'sendToPropertyInspector') {
			handlePluginMessage(jsonObj.payload);
		}
	};
}

function populateSlotDropdown() {
	const select = document.getElementById('slotNumber');
	select.innerHTML = '<option value="">Select a slot...</option>';

	for (let i = 1; i <= 30; i++) {
		const option = document.createElement('option');
		option.value = i;
		option.textContent = `Slot ${i}`;
		select.appendChild(option);
	}
}

function loadSettings() {
	const slotNumber = settings.slotNumber || '';
	document.getElementById('slotNumber').value = slotNumber;
}

function handlePluginMessage(payload) {
	console.log('[GuestSlot PI] Handling plugin message:', payload);
	if (payload.event === 'slotInfo') {
		updateGuestInfo(payload);
	}
}

function updateGuestInfo(info) {
	const guestDiv = document.getElementById('currentGuest');

	if (info.guest) {
		guestDiv.textContent = info.guest.displayName;
		guestDiv.style.color = '#fff';
		guestDiv.style.fontStyle = 'normal';
	} else if (info.slotNumber > 0) {
		guestDiv.textContent = `No guest in slot ${info.slotNumber}`;
		guestDiv.style.color = '#999';
		guestDiv.style.fontStyle = 'italic';
	} else {
		guestDiv.textContent = 'No slot selected';
		guestDiv.style.color = '#999';
		guestDiv.style.fontStyle = 'italic';
	}

	// Update slot dropdown options with guest count info
	const select = document.getElementById('slotNumber');
	const options = select.querySelectorAll('option');
	options.forEach((option, index) => {
		if (index === 0) return; // Skip "Select a slot..." option
		const slotNum = parseInt(option.value);
		if (slotNum <= info.totalGuests) {
			option.textContent = `Slot ${slotNum} (has guest)`;
		} else {
			option.textContent = `Slot ${slotNum} (empty)`;
		}
	});
}

function requestRefresh() {
	console.log('[GuestSlot PI] Requesting refresh');
	sendToPlugin({ event: 'refresh' });
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
		const slotNumber = parseInt(document.getElementById('slotNumber').value) || 0;

		const payload = {
			slotNumber: slotNumber > 0 ? slotNumber : undefined
		};

		console.log('[GuestSlot PI] Saving settings:', payload);

		websocket.send(JSON.stringify({
			action: actionInfo.action,
			event: 'setSettings',
			context: uuid,
			payload: payload
		}));
	}
}

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('slotNumber').addEventListener('change', saveSettings);
	document.getElementById('refreshBtn').addEventListener('click', requestRefresh);
});
