/** Extend window for Tauri bridges (bootstrapper only) */
declare global {
  interface Window {
    __DEBUG__?: boolean;
    __setOverlayUrl: (url: string) => void;
    __applySettings: (settings: Record<string, unknown>) => void;
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

export {};
