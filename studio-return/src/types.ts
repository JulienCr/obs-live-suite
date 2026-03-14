/** Severity levels matching CueSeverity from the main app */
export type Severity = "info" | "warn" | "urgent";

/** Cue types matching CueType from the main app (+ "clear" for clear events) */
export type CueType = "cue" | "countdown" | "question" | "context" | "note" | "reply" | "clear";

/** Countdown payload from the main app */
export interface CountdownPayload {
  mode: "duration" | "targetTime";
  durationSec?: number;
  targetTime?: string;
}

/** Presenter channel message payload */
export interface CuePayload {
  type: CueType;
  severity?: Severity;
  title?: string;
  body?: string;
  studioReturn?: boolean;
  countdownPayload?: CountdownPayload;
}

/** WebSocket message wrapper from the hub */
export interface WSMessage {
  channel: string;
  data: {
    type: string;
    payload: CuePayload;
  };
}

/** Runtime settings pushed by Tauri backend */
export interface StudioReturnSettings {
  displayDuration?: number | null;
  fontSize?: number | null;
  enabled?: boolean | null;
}

/** Extend window for Tauri bridges */
declare global {
  interface Window {
    __DEBUG__?: boolean;
    __applySettings: (settings: StudioReturnSettings) => void;
    __setWsPort: (port: number) => void;
    __testNotification: (severity?: Severity) => void;
  }
}
