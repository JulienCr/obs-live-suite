"use client";

import { useCallback } from "react";
import { create } from "zustand";
import { apiPost } from "@/lib/utils/ClientFetch";
import { CLIENT_ID } from "@/lib/utils/clientId";
import { PosterEventType } from "@/lib/models/OverlayEvents";
import type { VideoChapter } from "@/lib/models/Poster";
import { useWebSocketChannel } from "./useWebSocketChannel";

/**
 * Single source of truth for the operator's armed video poster.
 *
 * One workflow, two phases:
 *  1. **Staging** (`isLive: false`): operator clicked a video card. Floating
 *     preview + bottom timeline appear. Scrub/play/pause act locally only.
 *  2. **Live** (`isLive: true`): operator clicked Go Live. Video is on OBS.
 *     Same preview + timeline keep showing; scrub/play/pause/mute round-trip
 *     through `/api/overlays/poster(-bigpicture)` and OBS state ticks update
 *     `currentTime` / `duration` / `isPlaying` here.
 *
 * Persisted to localStorage **only while staging** so a refresh during cue
 * doesn't lose alignment work. After Go Live, the OBS-replayed `show` event
 * is the source of truth on reload.
 */

const STORAGE_KEY = "ols.armedVideoPoster";

export type DisplayMode = "left" | "right" | "bigpicture";

export interface ArmedVideoPoster {
  posterId: string;
  fileUrl: string;
  type: "video" | "youtube";
  displayMode: DisplayMode;
  startTime?: number;
  endTime?: number;
  endBehavior?: "stop" | "loop";
  source?: string;
  chapters?: VideoChapter[];

  /** false while staging locally, true after Go Live. */
  isLive: boolean;
  /** Local timeline state in cue, mirrored OBS state in live. */
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  duration: number; // 0 if unknown

  /** Set when this client owns the live overlay. */
  ownerClientId?: string;
}

export interface PosterInput {
  posterId: string;
  fileUrl: string;
  type: "video" | "youtube";
  startTime?: number;
  endTime?: number;
  endBehavior?: "stop" | "loop";
  source?: string;
  chapters?: VideoChapter[];
  duration?: number;
}

const VALID_DISPLAY_MODES: ReadonlySet<DisplayMode> = new Set(["left", "right", "bigpicture"]);

function loadInitial(): ArmedVideoPoster | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ArmedVideoPoster>;
    if (
      typeof parsed.posterId !== "string" ||
      typeof parsed.fileUrl !== "string" ||
      (parsed.type !== "video" && parsed.type !== "youtube") ||
      typeof parsed.displayMode !== "string" ||
      !VALID_DISPLAY_MODES.has(parsed.displayMode as DisplayMode) ||
      typeof parsed.currentTime !== "number" ||
      typeof parsed.isPlaying !== "boolean"
    ) {
      return null;
    }
    return {
      posterId: parsed.posterId,
      fileUrl: parsed.fileUrl,
      type: parsed.type,
      displayMode: parsed.displayMode as DisplayMode,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      endBehavior: parsed.endBehavior,
      source: parsed.source,
      chapters: parsed.chapters,
      isLive: false, // Persistence is staging-only; never restore as live.
      currentTime: parsed.currentTime,
      isPlaying: parsed.isPlaying,
      isMuted: true,
      duration: typeof parsed.duration === "number" ? parsed.duration : 0,
    };
  } catch {
    return null;
  }
}

function persist(state: ArmedVideoPoster | null): void {
  if (typeof window === "undefined") return;
  try {
    // Only persist while staging. Once live, OBS show-replay rehydrates on reload.
    if (state && !state.isLive) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage may be full or disabled; cue state is ephemeral enough to ignore.
  }
}

type ChannelKey = "poster" | "poster-bigpicture";

/**
 * Snapshot of the last `show` event seen on a channel, regardless of ownership.
 * Used by takeover: when the operator takes over an overlay owned by someone
 * else, we promote this snapshot to `armed` so the live mirror starts immediately.
 */
type ShowSnapshot = Omit<ArmedVideoPoster, "isLive" | "ownerClientId"> & {
  ownerClientId?: string;
};

interface ArmedStore {
  armed: ArmedVideoPoster | null;
  /** Last show seen on each channel; not React-rendered (set + read directly). */
  lastShow: Partial<Record<ChannelKey, ShowSnapshot>>;
  _set: (next: ArmedVideoPoster | null) => void;
  _patch: (patch: Partial<ArmedVideoPoster>) => void;
  _setLastShow: (channel: ChannelKey, snapshot: ShowSnapshot | null) => void;
}

const useArmedStore = create<ArmedStore>((set) => ({
  armed: loadInitial(),
  lastShow: {},
  _set: (next) => {
    persist(next);
    set({ armed: next });
  },
  _patch: (patch) =>
    set((state) => {
      if (!state.armed) return state;
      // Avoid no-op writes that would otherwise re-render every consumer.
      let changed = false;
      for (const k of Object.keys(patch) as Array<keyof ArmedVideoPoster>) {
        if (state.armed[k] !== patch[k]) {
          changed = true;
          break;
        }
      }
      if (!changed) return state;
      const next = { ...state.armed, ...patch };
      persist(next);
      return { armed: next };
    }),
  _setLastShow: (channel, snapshot) =>
    set((state) => ({
      lastShow: { ...state.lastShow, [channel]: snapshot ?? undefined },
    })),
}));

const posterEndpoint = (mode: DisplayMode) =>
  mode === "bigpicture" ? "/api/overlays/poster-bigpicture" : "/api/overlays/poster";

function armedMatchesChannel(armed: ArmedVideoPoster, isBigpicture: boolean): boolean {
  return isBigpicture ? armed.displayMode === "bigpicture" : armed.displayMode !== "bigpicture";
}

function buildShowPayload(armed: ArmedVideoPoster): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    posterId: armed.posterId,
    fileUrl: armed.fileUrl,
    type: armed.type,
    transition: "fade",
    ownerClientId: CLIENT_ID,
    resumeFrom: armed.currentTime,
    resumePlaying: armed.isPlaying,
  };
  if (armed.source) payload.source = armed.source;
  if (armed.chapters?.length) payload.chapters = armed.chapters;
  if (armed.startTime != null) payload.startTime = armed.startTime;
  if (armed.endTime != null) payload.endTime = armed.endTime;
  if (armed.endBehavior) payload.endBehavior = armed.endBehavior;
  if (armed.displayMode !== "bigpicture") payload.side = armed.displayMode;
  return payload;
}

export interface UseArmedVideoPosterReturn {
  armed: ArmedVideoPoster | null;
  arm: (poster: PosterInput, mode: DisplayMode) => void;
  clearArmed: () => void;
  goLive: () => Promise<boolean>;
  seek: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setMuted: (muted: boolean) => void;
  /** Reports duration from the player once metadata is known. Pre-live only;
   *  live updates flow in via WebSocket state ticks. */
  reportDuration: (duration: number) => void;
  /** Reports time from the player while staging. No-op once live (state ticks
   *  from OBS take precedence to avoid feedback loops). */
  reportTime: (time: number) => void;
  /** Reports play/pause from the player while staging. No-op once live. */
  reportPlaying: (playing: boolean) => void;
}

export function useArmedVideoPoster(): UseArmedVideoPosterReturn {
  const armed = useArmedStore((s) => s.armed);
  const _set = useArmedStore((s) => s._set);
  const _patch = useArmedStore((s) => s._patch);

  const arm = useCallback(
    (poster: PosterInput, mode: DisplayMode) => {
      _set({
        posterId: poster.posterId,
        fileUrl: poster.fileUrl,
        type: poster.type,
        displayMode: mode,
        startTime: poster.startTime,
        endTime: poster.endTime,
        endBehavior: poster.endBehavior,
        source: poster.source,
        chapters: poster.chapters,
        isLive: false,
        currentTime: poster.startTime ?? 0,
        isPlaying: false,
        isMuted: true,
        duration: poster.duration ?? 0,
      });
    },
    [_set]
  );

  const clearArmed = useCallback(() => {
    _set(null);
  }, [_set]);

  const goLive = useCallback(async (): Promise<boolean> => {
    const current = useArmedStore.getState().armed;
    if (!current || current.isLive) return false;
    try {
      await apiPost(posterEndpoint(current.displayMode), {
        action: PosterEventType.SHOW,
        payload: buildShowPayload(current),
      });
      _patch({ isLive: true, ownerClientId: CLIENT_ID });
      // After the patch, persist() won't store live state to localStorage,
      // so this also drops the staging cue automatically.
      return true;
    } catch (err) {
      console.error("[ArmedVideoPoster] goLive failed:", err);
      return false;
    }
  }, [_patch]);

  const seek = useCallback(
    (time: number) => {
      const current = useArmedStore.getState().armed;
      if (!current) return;
      _patch({ currentTime: time });
      if (current.isLive) {
        apiPost(posterEndpoint(current.displayMode), {
          action: PosterEventType.SEEK,
          payload: { time },
        }).catch((err) => console.error("[ArmedVideoPoster] seek failed:", err));
      }
    },
    [_patch]
  );

  const setPlaying = useCallback(
    (playing: boolean) => {
      const current = useArmedStore.getState().armed;
      if (!current) return;
      _patch({ isPlaying: playing });
      if (current.isLive) {
        apiPost(posterEndpoint(current.displayMode), {
          action: playing ? PosterEventType.PLAY : PosterEventType.PAUSE,
        }).catch((err) => console.error("[ArmedVideoPoster] setPlaying failed:", err));
      }
    },
    [_patch]
  );

  const setMuted = useCallback(
    (muted: boolean) => {
      const current = useArmedStore.getState().armed;
      if (!current) return;
      _patch({ isMuted: muted });
      if (current.isLive) {
        apiPost(posterEndpoint(current.displayMode), {
          action: muted ? PosterEventType.MUTE : PosterEventType.UNMUTE,
        }).catch((err) => console.error("[ArmedVideoPoster] setMuted failed:", err));
      }
    },
    [_patch]
  );

  const reportDuration = useCallback(
    (duration: number) => {
      if (!Number.isFinite(duration) || duration <= 0) return;
      _patch({ duration });
    },
    [_patch]
  );

  const reportTime = useCallback(
    (time: number) => {
      const current = useArmedStore.getState().armed;
      if (!current || current.isLive) return; // Live ticks come from OBS via WS.
      if (!Number.isFinite(time)) return;
      _patch({ currentTime: time });
    },
    [_patch]
  );

  const reportPlaying = useCallback(
    (playing: boolean) => {
      const current = useArmedStore.getState().armed;
      if (!current || current.isLive) return;
      _patch({ isPlaying: playing });
    },
    [_patch]
  );

  return {
    armed,
    arm,
    clearArmed,
    goLive,
    seek,
    setPlaying,
    setMuted,
    reportDuration,
    reportTime,
    reportPlaying,
  };
}

/**
 * Bridges the `poster` / `poster-bigpicture` WebSocket channels to the armed
 * store. Mount once at the shell level (next to `<PosterPreviewOverlay />`).
 *
 * - `show` event with `ownerClientId === CLIENT_ID` and a video/youtube payload:
 *   reconstitute armed as live (handles dashboard reload while live).
 * - `hide` event on the channel matching armed.displayMode: clear armed.
 * - State ticks while armed.isLive on the matching channel: update playback state.
 * - `takeover` event: update ownerClientId; if we lose ownership, clear armed.
 */
export function useArmedVideoPosterSync(): void {
  const _set = useArmedStore((s) => s._set);
  const _patch = useArmedStore((s) => s._patch);
  const _setLastShow = useArmedStore((s) => s._setLastShow);

  const onMessage = useCallback(
    (channel: string, raw: unknown) => {
      const msg = (raw ?? {}) as { type?: string; payload?: Record<string, unknown> };
      const isBigpicture = channel === "poster-bigpicture";
      const channelKey: ChannelKey = isBigpicture ? "poster-bigpicture" : "poster";
      const current = useArmedStore.getState().armed;

      if (msg.type === "show") {
        const p = msg.payload ?? {};
        const ownerClientId = p.ownerClientId as string | undefined;
        const type = p.type as string | undefined;
        const fileUrl = p.fileUrl as string | undefined;
        const posterId = p.posterId as string | undefined;
        const side = p.side as "left" | "right" | undefined;
        const displayMode: DisplayMode = isBigpicture ? "bigpicture" : (side ?? "left");

        // Only video/youtube posters interest us (images have no preview/timeline).
        if (!fileUrl || !posterId || (type !== "video" && type !== "youtube")) {
          // An image went up; clear any stash and any current armed on this channel
          // (image preempted whatever video was there).
          _setLastShow(channelKey, null);
          if (current?.isLive && armedMatchesChannel(current, isBigpicture)) {
            _set(null);
          }
          return;
        }

        const snapshot: ShowSnapshot = {
          posterId,
          fileUrl,
          type,
          displayMode,
          startTime: typeof p.startTime === "number" ? p.startTime : undefined,
          endTime: typeof p.endTime === "number" ? p.endTime : undefined,
          endBehavior: p.endBehavior as "stop" | "loop" | undefined,
          source: typeof p.source === "string" ? p.source : undefined,
          chapters: Array.isArray(p.chapters) ? (p.chapters as VideoChapter[]) : undefined,
          currentTime: typeof p.resumeFrom === "number" ? p.resumeFrom : 0,
          isPlaying: typeof p.resumePlaying === "boolean" ? p.resumePlaying : false,
          isMuted: true,
          duration: 0,
          ownerClientId,
        };
        _setLastShow(channelKey, snapshot);

        if (ownerClientId === CLIENT_ID) {
          // Reconstitute (or replace) as live — overrides any local staging cue.
          _set({ ...snapshot, isLive: true, ownerClientId });
        } else if (current?.isLive && armedMatchesChannel(current, isBigpicture)) {
          // Someone else owns this slot now — drop our live mirror.
          _set(null);
        }
        return;
      }

      if (msg.type === "hide") {
        _setLastShow(channelKey, null);
        if (current?.isLive && armedMatchesChannel(current, isBigpicture)) {
          _set(null);
        }
        return;
      }

      if (msg.type === "takeover") {
        const newOwner = msg.payload?.ownerClientId as string | undefined;
        const snapshot = useArmedStore.getState().lastShow[channelKey];
        if (current?.isLive && armedMatchesChannel(current, isBigpicture)) {
          if (newOwner !== CLIENT_ID) {
            _set(null);
          } else {
            _patch({ ownerClientId: newOwner });
          }
        } else if (newOwner === CLIENT_ID && snapshot) {
          // We took over from another operator — promote the snapshot to armed.
          _set({ ...snapshot, isLive: true, ownerClientId: newOwner });
        }
        if (snapshot) {
          _setLastShow(channelKey, { ...snapshot, ownerClientId: newOwner });
        }
        return;
      }

      // Otherwise treat as a 1Hz state tick (currentTime/duration/isPlaying/isMuted).
      if (!current?.isLive || !armedMatchesChannel(current, isBigpicture)) return;
      const data = raw as Record<string, unknown>;
      const next: Partial<ArmedVideoPoster> = {};
      if (typeof data.currentTime === "number" && Number.isFinite(data.currentTime)) {
        next.currentTime = data.currentTime;
      }
      if (typeof data.duration === "number" && Number.isFinite(data.duration) && data.duration > 0) {
        next.duration = data.duration;
      }
      if (typeof data.isPlaying === "boolean") next.isPlaying = data.isPlaying;
      if (typeof data.isMuted === "boolean") next.isMuted = data.isMuted;
      if (Object.keys(next).length > 0) _patch(next);
    },
    [_set, _patch, _setLastShow]
  );

  useWebSocketChannel(["poster", "poster-bigpicture"], onMessage, {
    logPrefix: "ArmedVideoPosterSync",
  });
}

/** Test-only escape hatch to reset the singleton store between tests. */
export function __resetArmedVideoPosterStoreForTests(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  useArmedStore.setState({ armed: null, lastShow: {} });
}
