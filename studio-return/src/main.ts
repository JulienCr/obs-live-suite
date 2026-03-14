import "./styles.css";
import { initDebug, debugLog } from "./debug";
import { initDom } from "./dom";
import { getConfig, applySettings } from "./config";
import { showNotification, hideNotification } from "./notification";
import { showCountdown } from "./countdown";
import { onPresenterMessage, onDismiss, setWsPort, connectWithDefault } from "./websocket";

// ---- Init DOM ----
initDebug();
initDom();

// ---- Apply initial font size ----
document.documentElement.style.setProperty(
  "--font-size",
  `${getConfig().fontSize}px`,
);

// ---- Tauri bridges ----
window.__applySettings = (settings) =>
  applySettings(settings, hideNotification);

window.__setWsPort = (port) => setWsPort(port);

window.__testNotification = (severity) => {
  showNotification({
    title: "TEST",
    body: `Message de test — ${severity || "info"}`,
    severity: severity || "info",
  });
};

// ---- Dismiss handler ----
onDismiss(() => {
  debugLog("Dismiss received — hiding overlay");
  hideNotification();
});

// ---- Message routing ----
onPresenterMessage((payload) => {
  if (payload.type === "countdown" && payload.countdownPayload) {
    showCountdown(payload);
    return;
  }

  debugLog(
    `Displaying: severity=${payload.severity || "info"} title=${payload.title || ""}`,
  );

  showNotification({
    title: payload.title || "",
    body: payload.body || "",
    severity: payload.severity || "info",
  });
});

// ---- Connect ----
debugLog("Studio Return initialized");

// Fallback: if Tauri doesn't send the port within 5s, connect with default
setTimeout(() => connectWithDefault(), 5000);
