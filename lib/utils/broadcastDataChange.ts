import { BackendClient } from "./BackendClient";
import type { SyncEntity, SyncAction, DataChangedEvent } from "@/lib/models/DataSyncEvents";

/**
 * Fire-and-forget broadcast of a data change event via the system WebSocket channel.
 * Other dashboard tabs listening on "system" will invalidate their React Query cache.
 */
export function broadcastDataChange(
  entity: SyncEntity,
  action: SyncAction,
  request: Request,
  entityId?: string
): void {
  const clientId = request.headers.get("x-client-id") ?? "unknown";

  const event: DataChangedEvent = {
    type: "data-changed",
    entity,
    action,
    entityId,
    clientId,
    timestamp: Date.now(),
  };

  BackendClient.publish("system", "data-changed", event).catch((err) => {
    console.error("[DataSync] Failed to broadcast:", err);
  });
}
