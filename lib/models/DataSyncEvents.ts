export type SyncEntity =
  | "guests"
  | "posters"
  | "profiles"
  | "themes"
  | "textPresets"
  | "titleReveals"
  | "settings";

export type SyncAction = "created" | "updated" | "deleted";

export interface DataChangedEvent {
  type: "data-changed";
  entity: SyncEntity;
  action: SyncAction;
  entityId?: string;
  clientId: string;
  timestamp: number;
}

/**
 * Extract a {@link DataChangedEvent} from a `system`-channel websocket message.
 *
 * The generic `ChannelManager.publish()` wraps the payload into an OverlayEvent
 * (`{ channel, type, payload, timestamp, id }`), so the real DataChangedEvent
 * lands under `.payload` — NOT at the top level. (Contrast `publishLiveAssist`,
 * which spreads its event flat, which is why live-assist worked but data-sync
 * silently didn't.) A flat event is also accepted defensively. Returns `null`
 * when the message isn't a data-changed event.
 */
export function parseDataChangedEvent(data: unknown): DataChangedEvent | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  const inner =
    msg.type === "data-changed" && msg.payload && typeof msg.payload === "object"
      ? (msg.payload as Record<string, unknown>)
      : msg;
  if (inner.type !== "data-changed") return null;
  if (typeof inner.entity !== "string" || typeof inner.clientId !== "string") return null;
  return inner as unknown as DataChangedEvent;
}
