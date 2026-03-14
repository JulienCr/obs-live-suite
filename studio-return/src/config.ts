import type { StudioReturnSettings } from "./types";
import { debugLog } from "./debug";

export interface Config {
  displayDuration: number;
  fontSize: number;
  enabled: boolean;
}

const config: Config = {
  displayDuration: 10,
  fontSize: 80,
  enabled: true,
};

export function getConfig(): Readonly<Config> {
  return config;
}

export function applySettings(
  settings: StudioReturnSettings,
  onDisable: () => void,
): void {
  debugLog(`Settings received: ${JSON.stringify(settings)}`);

  if (settings.displayDuration != null) {
    config.displayDuration = settings.displayDuration;
  }
  if (settings.fontSize != null) {
    config.fontSize = settings.fontSize;
    document.documentElement.style.setProperty(
      "--font-size",
      `${config.fontSize}px`,
    );
  }
  if (settings.enabled != null) {
    config.enabled = settings.enabled;
    if (!config.enabled) onDisable();
  }
}
