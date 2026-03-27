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
