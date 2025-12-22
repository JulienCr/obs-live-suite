// OBS-Suite Options Page Logic

const DEFAULT_SERVER_URL = "http://localhost:3000";

// DOM elements
const serverUrlInput = document.getElementById("serverUrl");
const saveBtn = document.getElementById("saveBtn");
const testBtn = document.getElementById("testBtn");
const statusMessage = document.getElementById("statusMessage");

// Load saved settings on page load
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
});

// Save button click handler
saveBtn.addEventListener("click", () => {
  saveSettings();
});

// Test button click handler
testBtn.addEventListener("click", () => {
  testConnection();
});

// Enter key in input saves settings
serverUrlInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    saveSettings();
  }
});

/**
 * Load settings from chrome.storage
 */
function loadSettings() {
  chrome.storage.sync.get(["serverUrl"], (result) => {
    serverUrlInput.value = result.serverUrl || DEFAULT_SERVER_URL;
  });
}

/**
 * Save settings to chrome.storage
 */
function saveSettings() {
  const serverUrl = serverUrlInput.value.trim() || DEFAULT_SERVER_URL;

  // Validate URL format
  if (!isValidUrl(serverUrl)) {
    showStatus("Invalid URL format. Please enter a valid URL.", "error");
    return;
  }

  chrome.storage.sync.set({ serverUrl }, () => {
    showStatus("Settings saved successfully!", "success");
  });
}

/**
 * Test connection to server
 */
async function testConnection() {
  const serverUrl = serverUrlInput.value.trim() || DEFAULT_SERVER_URL;

  // Validate URL format
  if (!isValidUrl(serverUrl)) {
    showStatus("Invalid URL format. Please enter a valid URL.", "error");
    return;
  }

  showStatus("Testing connection...", "info");
  testBtn.disabled = true;

  try {
    const response = await fetch(`${serverUrl}/api/assets/posters`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      showStatus(
        `Connection successful! Found ${data.posters?.length || 0} posters.`,
        "success"
      );
    } else {
      showStatus(
        `Server responded with status ${response.status}. Please check the URL.`,
        "error"
      );
    }
  } catch (error) {
    showStatus(
      `Connection failed: ${error.message}. Make sure OBS Live Suite is running.`,
      "error"
    );
  } finally {
    testBtn.disabled = false;
  }
}

/**
 * Show status message
 */
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove("hidden");

  // Auto-hide success messages after 5 seconds
  if (type === "success") {
    setTimeout(() => {
      statusMessage.classList.add("hidden");
    }, 5000);
  }
}

/**
 * Validate URL format
 */
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}
