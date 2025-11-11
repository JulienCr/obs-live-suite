/**
 * Singleton toaster for showing notifications
 * Blueprint pattern - create once, use everywhere
 */
import { OverlayToaster, Position } from "@blueprintjs/core";

export const AppToaster = OverlayToaster.createAsync({
  position: Position.TOP_RIGHT,
  maxToasts: 5,
  canEscapeKeyClear: true,
});
