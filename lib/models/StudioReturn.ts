/**
 * Monitor information reported by the Tauri app.
 * Not persisted to DB — refreshed each time the Tauri app starts or polls.
 */
export interface MonitorInfo {
  index: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  isPrimary: boolean;
}
